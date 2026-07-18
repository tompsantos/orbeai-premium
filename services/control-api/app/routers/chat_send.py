from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import Chat, Message, ModelRun, Project, Workspace
from app.models.core import utc_now
from app.schemas.chat_send import ChatSendRequest, ChatSendResponse, MemoryEventRead
from app.services.audit import write_audit_log
from app.services.auto_memory import maybe_create_auto_memory
from app.services.chat_runtime import execute_chat_runtime
from app.services.feature_flags import is_feature_enabled
from app.services.memory_context import build_memory_context, select_relevant_memories
from app.services.orbe_router import resolve_chat_route
from app.services.workspace_policies import get_workspace_policy, memory_context_limit
from app.services.workspace_settings import get_or_create_workspace_settings

router = APIRouter(prefix="/chat", tags=["chat"])


def get_project_or_404(project_id: str, db: Session, workspace_id: str) -> Project:
    project = db.scalar(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.workspace_id == workspace_id)
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def get_chat_or_404(chat_id: str, db: Session, workspace_id: str) -> Chat:
    chat = db.scalar(
        select(Chat)
        .where(Chat.id == chat_id)
        .where(Chat.workspace_id == workspace_id)
    )
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return chat


def get_workspace_or_404(workspace_id: str, db: Session) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return workspace


def make_chat_title(content: str) -> str:
    clean = " ".join(content.strip().split())
    if not clean:
        return "Nova conversa"
    if len(clean) <= 72:
        return clean
    return clean[:69].rstrip() + "..."


def resolve_or_create_chat(
    payload: ChatSendRequest,
    db: Session,
    workspace: Workspace,
) -> Chat:
    if payload.chat_id is not None:
        chat = get_chat_or_404(payload.chat_id, db, workspace.id)
        changed = False
        if payload.mode is not None and payload.mode != chat.mode:
            chat.mode = payload.mode
            changed = True
        if (
            payload.model_preference is not None
            and payload.model_preference != chat.model_preference
        ):
            chat.model_preference = payload.model_preference
            changed = True
        if changed:
            chat.updated_at = utc_now()
            db.add(chat)
            db.commit()
            db.refresh(chat)
        return chat

    project_id = payload.project_id
    if project_id is not None:
        get_project_or_404(project_id, db, workspace.id)

    workspace_settings = get_or_create_workspace_settings(db, workspace)
    resolved_mode = payload.mode or workspace_settings.default_chat_mode
    resolved_model_preference = (
        payload.model_preference or workspace_settings.default_model_preference
    )
    chat = Chat(
        workspace_id=workspace.id,
        project_id=project_id,
        title=payload.title or make_chat_title(payload.content),
        mode=resolved_mode,
        model_preference=resolved_model_preference,
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


@router.post("/send", response_model=ChatSendResponse, status_code=status.HTTP_201_CREATED)
def send_chat_message(
    payload: ChatSendRequest,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ChatSendResponse:
    started_at = perf_counter()
    chat = resolve_or_create_chat(payload, db, context.workspace)

    user_message = Message(
        chat_id=chat.id,
        role="user",
        content=payload.content,
        provider=None,
        model=None,
        input_tokens=None,
        output_tokens=None,
        meta={
            "source": "chat-send",
            "mode": chat.mode,
            "model_preference": chat.model_preference,
            "requested_mode": payload.mode,
            "requested_model_preference": payload.model_preference,
            "resolved_mode": chat.mode,
            "resolved_model_preference": chat.model_preference,
            "auth_user_id": context.user_id,
            "auth_workspace_id": context.workspace_id,
            "membership_role": context.role,
        },
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    memory_events: list[MemoryEventRead] = []
    auto_memory_enabled = is_feature_enabled(
        db=db,
        workspace_id=chat.workspace_id,
        key="auto_memory",
        default=True,
    )
    memory_context_enabled = is_feature_enabled(
        db=db,
        workspace_id=chat.workspace_id,
        key="memory_context",
        default=True,
    )
    real_providers_enabled = is_feature_enabled(
        db=db,
        workspace_id=chat.workspace_id,
        key="real_providers",
        default=True,
    )
    workspace_policy = get_workspace_policy(db, chat.workspace_id)

    if auto_memory_enabled:
        auto_memory_event = maybe_create_auto_memory(
            db=db,
            chat=chat,
            user_message_id=user_message.id,
            content=payload.content,
            memory_policy=workspace_policy.memory_policy,
        )
        if auto_memory_event is not None:
            memory_events.append(
                MemoryEventRead(
                    memory_id=auto_memory_event.memory_id,
                    label=auto_memory_event.label,
                    status=auto_memory_event.status,
                    action=auto_memory_event.action,
                    reason=auto_memory_event.reason,
                )
            )

    relevant_memories = []
    if memory_context_enabled:
        relevant_memories = select_relevant_memories(
            db=db,
            workspace_id=chat.workspace_id,
            project_id=chat.project_id,
            query=payload.content,
            limit=memory_context_limit(workspace_policy.memory_policy),
        )
    memory_context = build_memory_context(relevant_memories)

    decision = resolve_chat_route(
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        routing_mode="automático",
        real_providers_enabled=real_providers_enabled,
        workspace_id=chat.workspace_id,
    )

    history_rows = list(
        db.scalars(
            select(Message)
            .where(Message.chat_id == chat.id)
            .where(Message.id != user_message.id)
            .order_by(Message.created_at.asc())
        )
    )
    conversation_history = [
        {"role": message.role, "content": message.content}
        for message in history_rows
        if message.role in {"user", "assistant", "system"}
    ]

    runtime_execution = execute_chat_runtime(
        decision=decision,
        real_providers_enabled=real_providers_enabled,
        workspace_id=chat.workspace_id,
        user_id=context.user_id,
        chat_id=chat.id,
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        memory_context=memory_context,
        conversation_history=conversation_history,
    )
    result = runtime_execution.result
    selected_provider_slug = runtime_execution.selected_provider_slug
    provider_error = runtime_execution.provider_error
    cognition_error = runtime_execution.cognition_error
    router_reason = runtime_execution.router_reason
    decision_payload = decision.persisted_payload()

    assistant_message = Message(
        chat_id=chat.id,
        role="assistant",
        content=result.content,
        provider=result.provider_name,
        model=result.model_name,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        meta={
            "source": "chat-send",
            "router_primary_provider": decision.primary_provider_slug,
            "router_selected_provider": selected_provider_slug,
            "router_is_fallback": decision.is_fallback
            or runtime_execution.used_legacy_fallback,
            "router_decision": decision_payload,
            "provider_attempts": runtime_execution.provider_attempts,
            "runtime": runtime_execution.runtime_name,
            "provider_error": provider_error,
            "cognition_error": cognition_error,
            "memory_context_count": len(relevant_memories),
            "memory_event_count": len(memory_events),
            "feature_auto_memory_enabled": auto_memory_enabled,
            "feature_memory_context_enabled": memory_context_enabled,
            "feature_real_providers_enabled": real_providers_enabled,
            "workspace_memory_policy": workspace_policy.memory_policy,
            "workspace_allow_exports": workspace_policy.allow_exports,
            "workspace_allow_public_sharing": workspace_policy.allow_public_sharing,
            "workspace_data_retention_days": workspace_policy.data_retention_days,
            "auth_user_id": context.user_id,
            "auth_workspace_id": context.workspace_id,
            "membership_role": context.role,
        },
    )
    chat.updated_at = utc_now()
    db.add(assistant_message)
    db.add(chat)
    db.commit()
    db.refresh(assistant_message)

    latency_ms = int((perf_counter() - started_at) * 1000)
    model_run = ModelRun(
        workspace_id=chat.workspace_id,
        chat_id=chat.id,
        message_id=assistant_message.id,
        provider_name=result.provider_name,
        model_name=result.model_name,
        task_type="chat.send",
        status="success",
        latency_ms=latency_ms,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        estimated_cost_usd=result.estimated_cost_usd,
        router_reason=router_reason,
        fallback_chain=decision.fallback_chain,
        error_message=provider_error,
    )
    db.add(model_run)
    db.flush()

    write_audit_log(
        db=db,
        workspace_id=chat.workspace_id,
        action="chat.send",
        resource_type="chat",
        resource_id=chat.id,
        meta={
            "message_id": assistant_message.id,
            "model_run_id": model_run.id,
            "provider": result.provider_name,
            "model": result.model_name,
            "input_tokens": result.input_tokens,
            "output_tokens": result.output_tokens,
            "latency_ms": latency_ms,
            "router_decision": decision_payload,
            "provider_attempts": runtime_execution.provider_attempts,
            "memory_context_count": len(relevant_memories),
            "memory_event_count": len(memory_events),
            "provider_error": provider_error,
            "cognition_error": cognition_error,
            "runtime": runtime_execution.runtime_name,
            "feature_auto_memory_enabled": auto_memory_enabled,
            "feature_memory_context_enabled": memory_context_enabled,
            "feature_real_providers_enabled": real_providers_enabled,
            "workspace_memory_policy": workspace_policy.memory_policy,
            "workspace_allow_exports": workspace_policy.allow_exports,
            "workspace_allow_public_sharing": workspace_policy.allow_public_sharing,
            "workspace_data_retention_days": workspace_policy.data_retention_days,
            "requested_mode": payload.mode,
            "requested_model_preference": payload.model_preference,
            "resolved_mode": chat.mode,
            "resolved_model_preference": chat.model_preference,
            "auth_user_id": context.user_id,
            "auth_workspace_id": context.workspace_id,
            "membership_role": context.role,
        },
    )

    for event in memory_events:
        write_audit_log(
            db=db,
            workspace_id=chat.workspace_id,
            action="memory.auto_create",
            resource_type="memory",
            resource_id=event.memory_id,
            meta={
                "label": event.label,
                "status": event.status,
                "reason": event.reason,
                "source_message_id": user_message.id,
            },
        )

    db.commit()
    db.refresh(model_run)
    return ChatSendResponse(
        chat_id=chat.id,
        provider=result.provider_name,
        model=result.model_name,
        model_run_id=model_run.id,
        user_message=user_message,
        assistant_message=assistant_message,
        memory_events=memory_events,
    )
