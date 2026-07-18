from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.services.cognition_client import execute_cognition_turn
from app.services.knowledge_context import (
    KnowledgeContextSource,
    resolve_knowledge_context,
)
from app.services.orbe_router import ExecutionPlan, ExecutionStrategy, RouterDecision
from app.services.provider_gateway import GatewayExecution, execute_provider_plan
from app.services.providers.real import ProviderExecutionResult


@dataclass(frozen=True)
class ChatRuntimeExecution:
    result: ProviderExecutionResult
    selected_provider_slug: str
    router_reason: str
    provider_error: str | None
    cognition_error: str | None
    runtime_name: str
    used_legacy_fallback: bool
    knowledge_sources: list[KnowledgeContextSource]
    provider_attempts: list[dict[str, object]]


def _direct_plan(decision: RouterDecision) -> ExecutionPlan:
    plan = decision.execution_plan
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


def _provider_error(execution: GatewayExecution) -> str | None:
    return next(
        (
            str(attempt.error)
            for attempt in execution.attempts
            if attempt.status == "failed" and attempt.error
        ),
        None,
    )


def execute_chat_runtime(
    *,
    decision: RouterDecision,
    real_providers_enabled: bool,
    workspace_id: str,
    user_id: str,
    chat_id: str,
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None,
    conversation_history: list[dict[str, Any]],
    knowledge_context: str | None = None,
) -> ChatRuntimeExecution:
    settings = get_settings()
    cognition_error: str | None = None
    knowledge_sources: list[KnowledgeContextSource] = []

    if knowledge_context is None:
        knowledge_context, knowledge_sources = resolve_knowledge_context(
            workspace_id=workspace_id,
            chat_id=chat_id,
            query=content,
        )

    if decision.execution_strategy is ExecutionStrategy.COGNITION:
        try:
            result = execute_cognition_turn(
                workspace_id=workspace_id,
                user_id=user_id,
                chat_id=chat_id,
                content=content,
                mode=mode,
                memory_context=memory_context,
                knowledge_context=knowledge_context,
                conversation_history=conversation_history,
            )
            return ChatRuntimeExecution(
                result=result,
                selected_provider_slug="orbe-cognition",
                router_reason=decision.reason,
                provider_error=None,
                cognition_error=None,
                runtime_name="orbe-cognition",
                used_legacy_fallback=False,
                knowledge_sources=knowledge_sources,
                provider_attempts=[],
            )
        except Exception as exc:
            cognition_error = f"{type(exc).__name__}: {exc}"
            if not settings.cognition_fallback_to_legacy:
                raise

    execution = execute_provider_plan(
        _direct_plan(decision),
        content=content,
        mode=mode,
        model_preference=model_preference,
        memory_context=memory_context,
        knowledge_context=knowledge_context,
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    provider_error = _provider_error(execution)
    router_reason = decision.reason
    if cognition_error:
        router_reason = (
            f"{decision.reason} O cognition falhou antes da resposta e o gateway direto "
            "executou o plano de contingência."
        )

    return ChatRuntimeExecution(
        result=execution.result,
        selected_provider_slug=execution.selected_provider_slug,
        router_reason=router_reason,
        provider_error=provider_error,
        cognition_error=cognition_error,
        runtime_name="direct-provider",
        used_legacy_fallback=bool(cognition_error),
        knowledge_sources=knowledge_sources,
        provider_attempts=execution.attempts_payload(),
    )
