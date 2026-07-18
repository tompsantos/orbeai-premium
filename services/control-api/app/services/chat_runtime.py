from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.services.cognition_client import execute_cognition_turn
from app.services.knowledge_context import (
    KnowledgeContextSource,
    resolve_knowledge_context,
)
from app.services.orbe_router import RouterDecision
from app.services.providers.real import (
    ProviderExecutionResult,
    execute_provider,
    run_mock_provider,
)


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

    if settings.cognition_enabled:
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
                router_reason=(
                    f"{decision.reason} Execução entregue ao orbe cognition core, "
                    "runtime principal da orbeAI premium."
                ),
                provider_error=None,
                cognition_error=None,
                runtime_name="orbe-cognition",
                used_legacy_fallback=False,
                knowledge_sources=knowledge_sources,
            )
        except Exception as exc:
            cognition_error = f"{type(exc).__name__}: {exc}"
            if not settings.cognition_fallback_to_legacy:
                raise

    provider_error: str | None = None
    selected_provider_slug = decision.provider_slug if real_providers_enabled else "mock"

    try:
        result = execute_provider(
            provider_slug=selected_provider_slug,
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
            knowledge_context=knowledge_context,
        )
        router_reason = decision.reason

        if not real_providers_enabled and decision.provider_slug != "mock":
            router_reason = (
                f"{decision.reason} Feature flag real_providers está desligada; "
                "a execução foi desviada para orbe-mock."
            )
    except Exception as exc:
        provider_error = f"{type(exc).__name__}: {exc}"
        result = run_mock_provider(
            content=content,
            mode=mode,
            model_preference=model_preference,
            memory_context=memory_context,
            knowledge_context=knowledge_context,
        )
        router_reason = (
            f"{decision.reason} A execução legada falhou e o orbe-mock foi acionado. "
            f"Erro: {provider_error}"
        )

    if cognition_error:
        router_reason = (
            f"orbe cognition falhou e o fallback legado foi acionado. "
            f"Falha cognitiva: {cognition_error}. {router_reason}"
        )

    return ChatRuntimeExecution(
        result=result,
        selected_provider_slug=selected_provider_slug,
        router_reason=router_reason,
        provider_error=provider_error,
        cognition_error=cognition_error,
        runtime_name="legacy-provider",
        used_legacy_fallback=bool(cognition_error),
        knowledge_sources=knowledge_sources,
    )
