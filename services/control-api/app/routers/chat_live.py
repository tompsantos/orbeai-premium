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
from app.services.knowledge_context import KnowledgeContextSource, resolve_knowledge_context
from app.services.live_run_registry import (
    LiveRunOwner,
    get_owned_live_run,
    live_run_stop_requested,
    register_live_run,
    request_live_run_stop,
    unregister_live_run,
)
from app.services.memory_context import build_memory_context, select_relevant_memories
from app.services.orbe_router import (
    ExecutionPlan,
    ExecutionStrategy,
    RouterDecision,
    resolve_chat_route,
    resolve_legacy_chat_route,
)
from app.services.provider_gateway import (
    GatewayExecution,
    ProviderGatewayError,
    execute_provider_plan,
)
from app.services.providers.mock import estimate_tokens
from app.services.providers.real import ProviderExecutionResult
from app.services.workspace_policies import (
    WorkspacePolicy,
    get_workspace_policy,
    memory_context_limit,
)

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
    knowledge_context: str | None
    knowledge_sources: list[KnowledgeContextSource]
    knowledge_context_enabled: bool
    conversation_history: list[dict[str, Any]]
    decision: RouterDecision
    workspace_policy: WorkspacePolicy
    auto_memory_enabled: bool
    memory_context_enabled: bool
    real_providers_enabled: bool
    router_v1_enabled: bool
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
    settings = get_settings()
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
    knowledge_context_enabled = is_feature_enabled(
        db=db,
        workspace_id=chat.workspace_id,
        key="knowledge_context",
        default=True,
    )
    router_v1_enabled = is_feature_enabled(
        db=db,
        workspace_id=chat.workspace_id,
        key="orbe_router_v1",
        default=True,
    )

    knowledge_context: str | None = None
    knowledge_sources: list[KnowledgeContextSource] = []
    if knowledge_context_enabled:
        knowledge_context, knowledge_sources = resolve_knowledge_context(
            workspace_id=chat.workspace_id,
            chat_id=chat.id,
            query=payload.content,
            request_id=request_id,
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
    memory_context = build_memory_context(relevant_memories)

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

    resolver = resolve_chat_route if router_v1_enabled else resolve_legacy_chat_route
    decision = resolver(
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        routing_mode="automático",
        memory_context_count=len(relevant_memories) if router_v1_enabled else 0,
        knowledge_context_count=len(knowledge_sources) if router_v1_enabled else 0,
        cognition_enabled=settings.cognition_enabled,
        real_providers_enabled=real_providers_enabled,
    ) if router_v1_enabled else resolver(
        content=payload.content,
        mode=chat.mode,
        model_preference=chat.model_preference,
        routing_mode="automático",
        cognition_enabled=settings.cognition_enabled,
        real_providers_enabled=real_providers_enabled,
    )

    decision_payload = decision.persisted_payload()
    user_message.meta = {**(user_message.meta or {}), "router_decision": decision_payload}
    db.add(user_message)
    write_audit_log(
        db=db,
        workspace_id=chat.workspace_id,
        action="router.decision",
        resource_type="message",
        resource_id=user_message.id,
        request_id=request_id,
        meta={
            "chat_id": chat.id,
            "router_v1_enabled": router_v1_enabled,
            "decision": decision_payload,
            "auth_user_id": context.user_id,
            "membership_role": context.role,
        },
    )
    db.commit()
    db.refresh(user_message)

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
        memory_context=memory_context,
        memory_context_count=len(relevant_memories),
        knowledge_context=knowledge_context,
        knowledge_sources=knowledge_sources,
        knowledge_context_enabled=knowledge_context_enabled,
        conversation_history=conversation_history,
        decision=decision,
        workspace_policy=workspace_policy,
        auto_memory_enabled=auto_memory_enabled,
        memory_context_enabled=memory_context_enabled,
        real_providers_enabled=real_providers_enabled,
        router_v1_enabled=router_v1_enabled,
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
    provider_attempts: list[dict[str, object]] | None = None,
    used_provider_fallback: bool = False,
    used_cognition_fallback: bool = False,
) -> ChatSendResponse:
    db = SessionLocal()
    try:
        chat = db.get(Chat, turn.chat_id)
        user_message = db.get(Message, turn.user_message_id)
        if chat is None or user_message is None:
            raise RuntimeError("turno vivo perdeu o contexto persistido")

        knowledge_source_payloads = [
            source.public_payload() for source in turn.knowledge_sources
        ]
        decision_payload = turn.decision.persisted_payload()
        latency_ms = int((perf_counter() - turn.started_at) * 1000)
        actual_fallback = (
            turn.decision.is_fallback
            or used_provider_fallback
            or used_cognition_fallback
        )

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
                "router_decision": decision_payload,
                "router_primary_provider": turn.decision.primary_provider_slug,
                "router_selected_provider": result.provider_name,
                "router_is_fallback": actual_fallback,
                "provider_attempts": provider_attempts or [],
                "runtime": runtime_name,
                "run_status": run_status,
                "latency_ms": latency_ms,
                "provider_error": provider_error,
                "cognition_error": cognition_error,
                "used_provider_fallback": used_provider_fallback,
                "used_cognition_fallback": used_cognition_fallback,
                "memory_context_count": turn.memory_context_count,
                "memory_event_count": len(turn.memory_events),
                "knowledge_context_count": len(turn.knowledge_sources),
                "knowledge_sources": knowledge_source_payloads,
                "feature_auto_memory_enabled": turn.auto_memory_enabled,
                "feature_memory_context_enabled": turn.memory_context_enabled,
                "feature_knowledge_context_enabled": turn.knowledge_context_enabled,
                "feature_real_providers_enabled": turn.real_providers_enabled,
                "feature_orbe_router_v1_enabled": turn.router_v1_enabled,
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

        model_run = ModelRun(
            workspace_id=turn.workspace_id,
            chat_id=turn.chat_id,
            message_id=assistant_message.id,
            provider_name=result.provider_name,
            model_name=result.model_name,
            task_type=f"chat.live.{turn.decision.execution_strategy.value}",
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
                "latency_ms": latency_ms,
                "router_decision": decision_payload,
                "provider_attempts": provider_attempts or [],
                "memory_context_count": turn.memory_context_count,
                "memory_event_count": len(turn.memory_events),
                "knowledge_context_count": len(turn.knowledge_sources),
                "knowledge_sources": knowledge_source_payloads,
                "provider_error": provider_error,
                "cognition_error": cognition_error,
                "used_provider_fallback": used_provider_fallback,
                "used_cognition_fallback": used_cognition_fallback,
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
        input_tokens=estimate_tokens(
            turn.content + (turn.memory_context or "") + (turn.knowledge_context or "")
        ),
        output_tokens=estimate_tokens(content),
        latency_ms=int((perf_counter() - turn.started_at) * 1000),
        estimated_cost_usd=0.0,
    )


def _direct_plan(turn: LiveTurnContext) -> ExecutionPlan:
    plan = turn.decision.execution_plan
    return ExecutionPlan(
        strategy=ExecutionStrategy.DIRECT_PROVIDER,
        route_kind=plan.route_kind,
        primary_provider_slug=plan.primary_provider_slug,
        provider_chain=plan.provider_chain,
        model_by_provider=plan.model_by_provider,
        capability_ids=plan.capability_ids,
        timeout_seconds=plan.timeout_seconds,
        retry_attempts=plan.retry_attempts,
        allow_mock=plan.allow_mock,
        implemented=plan.implemented,
    )


def _execute_direct(turn: LiveTurnContext) -> GatewayExecution:
    return execute_provider_plan(
        _direct_plan(turn),
        content=turn.content,
        mode=turn.chat_mode,
        model_preference=turn.model_preference,
        memory_context=turn.memory_context,
        knowledge_context=turn.knowledge_context,
        real_providers_enabled=turn.real_providers_enabled,
    )


def _stream_direct_execution(
    turn: LiveTurnContext,
    execution: GatewayExecution,
    *,
    cognition_error: str | None = None,
    used_cognition_fallback: bool = False,
) -> Iterator[str]:
    result = execution.result
    streamed = ""
    attempts = execution.attempts_payload()
    provider_error = next(
        (
            str(attempt.get("error"))
            for attempt in attempts
            if attempt.get("status") == "failed" and attempt.get("error")
        ),
        None,
    )

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
                    runtime_name="direct-provider",
                    run_status="stopped",
                    provider_error=provider_error,
                    cognition_error=cognition_error,
                    provider_attempts=attempts,
                    used_provider_fallback=execution.used_fallback,
                    used_cognition_fallback=used_cognition_fallback,
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
        runtime_name="direct-provider",
        provider_error=provider_error,
        cognition_error=cognition_error,
        provider_attempts=attempts,
        used_provider_fallback=execution.used_fallback,
        used_cognition_fallback=used_cognition_fallback,
    )
    yield _sse(
        "response.completed",
        request_id=turn.request_id,
        chat_id=turn.chat_id,
        response=response.model_dump(mode="json"),
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
        runtime=turn.decision.execution_strategy.value,
    )
    yield _sse(
        "router.decision",
        request_id=turn.request_id,
        chat_id=turn.chat_id,
        decision=turn.decision.persisted_payload(),
    )

    if turn.knowledge_sources:
        yield _sse(
            "knowledge.context",
            request_id=turn.request_id,
            chat_id=turn.chat_id,
            source_count=len(turn.knowledge_sources),
            sources=[source.public_payload() for source in turn.knowledge_sources],
        )

    try:
        if turn.decision.execution_strategy is ExecutionStrategy.COGNITION:
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
                    knowledge_context=turn.knowledge_context,
                    knowledge_context_resolved=True,
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
                        result = _cognition_result(
                            turn,
                            accumulated.strip(),
                            "orbe-cognition-default",
                        )
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
                    reason="cognition falhou antes de transmitir deltas; gateway direto ativado",
                )
                execution = _execute_direct(turn)
                yield from _stream_direct_execution(
                    turn,
                    execution,
                    cognition_error=cognition_error,
                    used_cognition_fallback=True,
                )
                return

        yield _sse(
            "execution.started",
            request_id=turn.request_id,
            chat_id=turn.chat_id,
            strategy="direct_provider",
            provider_chain=list(turn.decision.execution_plan.provider_chain),
        )
        execution = _execute_direct(turn)
        yield from _stream_direct_execution(turn, execution)
    except ProviderGatewayError as exc:
        yield _sse(
            "response.failed",
            request_id=turn.request_id,
            chat_id=turn.chat_id,
            error=str(exc),
            provider_attempts=[attempt.persisted_payload() for attempt in exc.attempts],
            response=None,
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
