from __future__ import annotations

import json
from collections.abc import Iterator
from dataclasses import dataclass
from time import perf_counter
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import SessionLocal, get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import Chat, Message, ModelRun
from app.models.core import utc_now
from app.routers.chat_send import resolve_or_create_chat
from app.schemas.chat_send import ChatSendRequest, ChatSendResponse, MemoryEventRead
from app.schemas.messages import MessageRead
from app.services.audit import write_audit_log
from app.services.auto_memory import maybe_create_auto_memory
from app.services.cognition_client import (
    CognitionExecutionError,
    approve_cognition_turn,
    stop_cognition_turn,
    stream_cognition_turn,
)
from app.services.feature_flags import is_feature_enabled
from app.services.live_run_registry import (
    LiveRunOwner,
    get_owned_live_run,
    live_run_stop_requested,
    register_live_run,
    request_live_run_stop,
    unregister_live_run,
)
from app.services.memory_context import build_memory_context, select_relevant_memories
from app.services.orbe_router import RouterDecision, resolve_chat_route
from app.services.providers.mock import estimate_tokens
from app.services.providers.real import (
    ProviderExecutionResult,
    execute_provider,
    run_mock_provider,
)
from app.services.workspace_policies import WorkspacePolicy, get_workspace_policy, memory_context_limit

router = APIRouter(prefix="/chat", tags=["chat"])


class ApprovalDecision(BaseModel):
    choice: Literal["once", "session", "deny"]


@dataclass(frozen=True)
class LiveTurnContext:
    request_id: str
    workspace_id: str
    user_id: str
    membership_role: str
    chat_id: str
    chat_mode: str
    model_preference: str
    content: str
    user_message_id: str
    user_message: dict[str, Any]
    memory_events: list[MemoryEventRead]
    memory_context: str | None
    memory_context_count: int
    conversation_history: list[dict[str, Any]]
    decision: RouterDecision
    workspace_policy: WorkspacePolicy
    auto_memory_enabled: bool
    memory_context_enabled: bool
    real_providers_enabled: bool
    started_at: float


def _sse(event_type: str, **data: Any) -> str:
    payload = json.dumps(
        {"type": event_type, **data},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return f"event: {event_type}\ndata: {payload}\n\n"


def _prepare_live_turn(
    payload: ChatSendRequest,
    db: Session,
    context: CurrentWorkspaceContext,
) -> LiveTurnContext:
    started_at = perf_counter()
    chat = resolve_or_create_chat(payload, db, context.workspace)
    request_id = f"live_{uuid4().hex}"

    user_message = Message(
        chat_id=chat.id,
        role="user",
        content=payload.content,
        provider=None,
        model=None,
        input_tokens=None,
        output_tokens=None,
        meta={
            "source": "chat-live",
            "request_id": request_id,
            "mode": chat.mode,
            "model_preference": chat.model_preference,
            "auth_user_id": context.user_id,
            "auth_workspace_id": context.workspace_id,
            "membership_role": context.role,
        },
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

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
    memory_events: list[MemoryEventRead] = []

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
    decision = resolve_chat_route(
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        routing_mode="automático",
    )

    register_live_run(
        LiveRunOwner(
            request_id=request_id,
            workspace_id=chat.workspace_id,
            user_id=context.user_id,
            chat_id=chat.id,
        )
    )

    return LiveTurnContext(
        request_id=request_id,
        workspace_id=chat.workspace_id,
        user_id=context.user_id,
        membership_role=context.role,
        chat_id=chat.id,
        chat_mode=chat.mode,
        model_preference=chat.model_preference,
        content=payload.content,
        user_message_id=user_message.id,
        user_message=MessageRead.model_validate(user_message).model_dump(mode="json"),
        memory_events=memory_events,
        memory_context=build_memory_context(relevant_memories),
        memory_context_count=len(relevant_memories),
        conversation_history=conversation_history,
        decision=decision,
        workspace_policy=workspace_policy,
        auto_memory_enabled=auto_memory_enabled,
        memory_context_enabled=memory_context_enabled,
        real_providers_enabled=real_providers_enabled,
        started_at=started_at,
    )


def _finalize_live_turn(
    turn: LiveTurnContext,
    result: ProviderExecutionResult,
    *,
    runtime_name: str,
    run_status: str = "success",
    provider_error: str | None = None,
    cognition_error: str | None = None,
    used_legacy_fallback: bool = False,
) -> ChatSendResponse:
    db = SessionLocal()
    try:
        chat = db.get(Chat, turn.chat_id)
        user_message = db.get(Message, turn.user_message_id)
        if chat is None or user_message is None:
            raise RuntimeError("turno vivo perdeu o contexto persistido")

        assistant_message = Message(
            chat_id=chat.id,
            role="assistant",
            content=result.content,
            provider=result.provider_name,
            model=result.model_name,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            meta={
                "source": "chat-live",
                "request_id": turn.request_id,
                "router_primary_provider": turn.decision.primary_provider_slug,
                "router_selected_provider": result.provider_name,
                "router_is_fallback": turn.decision.is_fallback or used_legacy_fallback,
                "runtime": runtime_name,
                "run_status": run_status,
                "provider_error": provider_error,
                "cognition_error": cognition_error,
                "memory_context_count": turn.memory_context_count,
                "memory_event_count": len(turn.memory_events),
                "feature_auto_memory_enabled": turn.auto_memory_enabled,
                "feature_memory_context_enabled": turn.memory_context_enabled,
                "feature_real_providers_enabled": turn.real_providers_enabled,
                "workspace_memory_policy": turn.workspace_policy.memory_policy,
                "auth_user_id": turn.user_id,
                "auth_workspace_id": turn.workspace_id,
                "membership_role": turn.membership_role,
            },
        )
        chat.updated_at = utc_now()
        db.add(assistant_message)
        db.add(chat)
        db.commit()
        db.refresh(assistant_message)

        latency_ms = int((perf_counter() - turn.started_at) * 1000)
        model_run = ModelRun(
            workspace_id=turn.workspace_id,
            chat_id=turn.chat_id,
            message_id=assistant_message.id,
            provider_name=result.provider_name,
            model_name=result.model_name,
            task_type="chat.live",
            status=run_status,
            latency_ms=latency_ms,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            estimated_cost_usd=result.estimated_cost_usd,
            router_reason=turn.decision.reason,
            fallback_chain=turn.decision.fallback_chain,
            error_message=provider_error or cognition_error,
        )
        db.add(model_run)
        db.flush()

        write_audit_log(
            db=db,
            workspace_id=turn.workspace_id,
            action="chat.live",
            resource_type="chat",
            resource_id=turn.chat_id,
            request_id=turn.request_id,
            meta={
                "message_id": assistant_message.id,
                "model_run_id": model_run.id,
                "provider": result.provider_name,
                "model": result.model_name,
                "runtime": runtime_name,
                "status": run_status,
                "memory_context_count": turn.memory_context_count,
                "memory_event_count": len(turn.memory_events),
                "provider_error": provider_error,
                "cognition_error": cognition_error,
                "used_legacy_fallback": used_legacy_fallback,
                "auth_user_id": turn.user_id,
                "membership_role": turn.membership_role,
            },
        )

        for event in turn.memory_events:
            write_audit_log(
                db=db,
                workspace_id=turn.workspace_id,
                action="memory.auto_create",
                resource_type="memory",
                resource_id=event.memory_id,
                request_id=turn.request_id,
                meta={
                    "label": event.label,
                    "status": event.status,
                    "reason": event.reason,
                    "source_message_id": turn.user_message_id,
                },
            )

        db.commit()
        db.refresh(model_run)

        return ChatSendResponse(
            chat_id=turn.chat_id,
            provider=result.provider_name,
            model=result.model_name,
            model_run_id=model_run.id,
            user_message=user_message,
            assistant_message=assistant_message,
            memory_events=turn.memory_events,
        )
    finally:
        db.close()


def _legacy_fallback(turn: LiveTurnContext) -> tuple[ProviderExecutionResult, str | None]:
    selected_provider = turn.decision.provider_slug if turn.real_providers_enabled else "mock"
    try:
        return (
            execute_provider(
                provider_slug=selected_provider,
                content=turn.content,
                mode=turn.chat_mode,
                model_preference=turn.model_preference,
                memory_context=turn.memory_context,
            ),
            None,
        )
    except Exception as exc:
        error = f"{type(exc).__name__}: {exc}"
        return (
            run_mock_provider(
                content=turn.content,
                mode=turn.chat_mode,
                model_preference=turn.model_preference,
                memory_context=turn.memory_context,
            ),
            error,
        )


def _text_chunks(content: str, target: int = 56) -> Iterator[str]:
    chunk = ""
    for word in content.split(" "):
        candidate = word if not chunk else f"{chunk} {word}"
        if chunk and len(candidate) > target:
            yield chunk + " "
            chunk = word
        else:
            chunk = candidate
    if chunk:
        yield chunk


def _cognition_result(turn: LiveTurnContext, content: str, model: str) -> ProviderExecutionResult:
    return ProviderExecutionResult(
        content=content,
        provider_name="orbe-cognition",
        model_name=model or "orbe-cognition-default",
        input_tokens=estimate_tokens(turn.content + (turn.memory_context or "")),
        output_tokens=estimate_tokens(content),
        latency_ms=int((perf_counter() - turn.started_at) * 1000),
        estimated_cost_usd=0.0,
    )


def _stream_live_turn(turn: LiveTurnContext) -> Iterator[str]:
    settings = get_settings()
    accumulated = ""
    saw_delta = False
    cognition_error: str | None = None

    yield _sse(
        "run.started",
        request_id=turn.request_id,
        chat_id=turn.chat_id,
        user_message=turn.user_message,
        runtime="orbe-cognition" if settings.cognition_enabled else "legacy-provider",
    )

    try:
        if settings.cognition_enabled:
            try:
                for event in stream_cognition_turn(
                    request_id=turn.request_id,
                    workspace_id=turn.workspace_id,
                    user_id=turn.user_id,
                    chat_id=turn.chat_id,
                    content=turn.content,
                    mode=turn.chat_mode,
                    memory_context=turn.memory_context,
                    conversation_history=turn.conversation_history,
                ):
                    event_type = str(event.get("type") or "message")

                    if event_type == "run.started":
                        continue
                    if event_type == "response.delta":
                        delta = str(event.get("delta") or "")
                        accumulated += delta
                        saw_delta = saw_delta or bool(delta)
                        yield _sse(
                            "response.delta",
                            request_id=turn.request_id,
                            chat_id=turn.chat_id,
                            delta=delta,
                        )
                        continue
                    if event_type == "response.completed":
                        content = str(event.get("final_response") or accumulated).strip()
                        if not content:
                            raise CognitionExecutionError("cognition encerrou sem resposta")
                        result = _cognition_result(turn, content, str(event.get("model") or ""))
                        response = _finalize_live_turn(
                            turn,
                            result,
                            runtime_name="orbe-cognition",
                        )
                        yield _sse(
                            "response.completed",
                            request_id=turn.request_id,
                            chat_id=turn.chat_id,
                            response=response.model_dump(mode="json"),
                        )
                        return
                    if event_type == "response.stopped":
                        partial = str(event.get("partial_response") or accumulated).strip()
                        response_data = None
                        if partial:
                            result = _cognition_result(
                                turn,
                                partial,
                                str(event.get("model") or "orbe-cognition-default"),
                            )
                            response_data = _finalize_live_turn(
                                turn,
                                result,
                                runtime_name="orbe-cognition",
                                run_status="stopped",
                            ).model_dump(mode="json")
                        yield _sse(
                            "response.stopped",
                            request_id=turn.request_id,
                            chat_id=turn.chat_id,
                            partial_response=partial,
                            response=response_data,
                        )
                        return
                    if event_type == "response.failed":
                        raise CognitionExecutionError(str(event.get("error") or "falha cognitiva"))

                    yield _sse(
                        event_type,
                        **{key: value for key, value in event.items() if key != "type"},
                    )
            except Exception as exc:
                cognition_error = f"{type(exc).__name__}: {exc}"
                if saw_delta or not settings.cognition_fallback_to_legacy:
                    if accumulated.strip():
                        result = _cognition_result(turn, accumulated.strip(), "orbe-cognition-default")
                        response_data = _finalize_live_turn(
                            turn,
                            result,
                            runtime_name="orbe-cognition",
                            run_status="failed",
                            cognition_error=cognition_error,
                        ).model_dump(mode="json")
                    else:
                        response_data = None
                    yield _sse(
                        "response.failed",
                        request_id=turn.request_id,
                        chat_id=turn.chat_id,
                        error="a execução cognitiva foi interrompida por uma falha",
                        response=response_data,
                    )
                    return

        yield _sse(
            "fallback.started",
            request_id=turn.request_id,
            chat_id=turn.chat_id,
            reason=(
                "cognition indisponível; contingência segura ativada"
                if cognition_error
                else "cognition desativado neste ambiente"
            ),
        )
        result, provider_error = _legacy_fallback(turn)
        streamed = ""
        for chunk in _text_chunks(result.content):
            if live_run_stop_requested(turn.request_id):
                if streamed.strip():
                    stopped_result = ProviderExecutionResult(
                        content=streamed.strip(),
                        provider_name=result.provider_name,
                        model_name=result.model_name,
                        input_tokens=result.input_tokens,
                        output_tokens=estimate_tokens(streamed),
                        latency_ms=result.latency_ms,
                        estimated_cost_usd=result.estimated_cost_usd,
                    )
                    response_data = _finalize_live_turn(
                        turn,
                        stopped_result,
                        runtime_name="legacy-provider",
                        run_status="stopped",
                        provider_error=provider_error,
                        cognition_error=cognition_error,
                        used_legacy_fallback=bool(cognition_error),
                    ).model_dump(mode="json")
                else:
                    response_data = None
                yield _sse(
                    "response.stopped",
                    request_id=turn.request_id,
                    chat_id=turn.chat_id,
                    partial_response=streamed.strip(),
                    response=response_data,
                )
                return

            streamed += chunk
            yield _sse(
                "response.delta",
                request_id=turn.request_id,
                chat_id=turn.chat_id,
                delta=chunk,
            )

        response = _finalize_live_turn(
            turn,
            result,
            runtime_name="legacy-provider",
            provider_error=provider_error,
            cognition_error=cognition_error,
            used_legacy_fallback=bool(cognition_error),
        )
        yield _sse(
            "response.completed",
            request_id=turn.request_id,
            chat_id=turn.chat_id,
            response=response.model_dump(mode="json"),
        )
    finally:
        unregister_live_run(turn.request_id)


@router.post("/live", status_code=status.HTTP_201_CREATED)
def live_chat_message(
    payload: ChatSendRequest,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> StreamingResponse:
    turn = _prepare_live_turn(payload, db, context)
    return StreamingResponse(
        _stream_live_turn(turn),
        status_code=status.HTTP_201_CREATED,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.post("/live/{request_id}/stop")
def stop_live_chat(
    request_id: str,
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> dict[str, Any]:
    if not request_live_run_stop(request_id, context.workspace_id, context.user_id):
        raise HTTPException(status_code=404, detail="execução ativa não encontrada")

    cognition_accepted = False
    try:
        cognition_accepted = stop_cognition_turn(request_id)
    except CognitionExecutionError:
        cognition_accepted = False

    return {
        "request_id": request_id,
        "accepted": True,
        "cognition_accepted": cognition_accepted,
    }


@router.post("/live/{request_id}/approval")
def approve_live_chat(
    request_id: str,
    payload: ApprovalDecision,
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> dict[str, Any]:
    owner = get_owned_live_run(request_id, context.workspace_id, context.user_id)
    if owner is None:
        raise HTTPException(status_code=404, detail="execução ativa não encontrada")

    try:
        resolved = approve_cognition_turn(request_id, payload.choice)
    except CognitionExecutionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "request_id": request_id,
        "accepted": resolved > 0,
        "resolved": resolved,
    }
