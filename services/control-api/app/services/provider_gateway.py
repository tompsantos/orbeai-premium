from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from app.core.config import get_settings
from app.services.orbe_router import ExecutionPlan, ExecutionStrategy
from app.services.provider_registry import ProviderRegistry, build_provider_registry
from app.services.providers.real import ProviderExecutionResult, execute_provider


@dataclass(frozen=True)
class ProviderAttempt:
    provider_slug: str
    model_name: str
    attempt: int
    status: str
    latency_ms: int
    error: str | None = None
    state_reason: str | None = None

    def persisted_payload(self) -> dict[str, object]:
        return {
            "provider_slug": self.provider_slug,
            "model_name": self.model_name,
            "attempt": self.attempt,
            "status": self.status,
            "latency_ms": self.latency_ms,
            "error": self.error,
            "state_reason": self.state_reason,
        }


@dataclass(frozen=True)
class GatewayExecution:
    result: ProviderExecutionResult
    attempts: tuple[ProviderAttempt, ...]
    selected_provider_slug: str
    used_fallback: bool

    def attempts_payload(self) -> list[dict[str, object]]:
        return [attempt.persisted_payload() for attempt in self.attempts]


class ProviderGatewayError(RuntimeError):
    def __init__(self, message: str, attempts: tuple[ProviderAttempt, ...]) -> None:
        super().__init__(message)
        self.attempts = attempts


def execute_provider_plan(
    plan: ExecutionPlan,
    *,
    content: str,
    mode: str,
    model_preference: str,
    memory_context: str | None = None,
    knowledge_context: str | None = None,
    real_providers_enabled: bool = True,
    registry: ProviderRegistry | None = None,
    workspace_id: str | None = None,
) -> GatewayExecution:
    if plan.strategy is not ExecutionStrategy.DIRECT_PROVIDER:
        raise ValueError("gateway direto recebeu plano de outra estratégia")

    settings = get_settings()
    registry = registry or build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    attempts: list[ProviderAttempt] = []

    for provider_slug in plan.provider_chain:
        provider = registry.get(provider_slug)
        if not provider.executable:
            attempts.append(
                ProviderAttempt(
                    provider_slug=provider_slug,
                    model_name=provider.model_name,
                    attempt=0,
                    status="skipped",
                    latency_ms=0,
                    state_reason=provider.state_reason,
                )
            )
            continue

        max_attempts = 1 if provider_slug == "mock" else 1 + plan.retry_attempts
        for attempt_number in range(1, max_attempts + 1):
            started_at = perf_counter()
            try:
                result = execute_provider(
                    provider_slug=provider_slug,
                    content=content,
                    mode=mode,
                    model_preference=model_preference,
                    memory_context=memory_context,
                    knowledge_context=knowledge_context,
                    workspace_id=workspace_id,
                )
            except Exception as exc:
                attempts.append(
                    ProviderAttempt(
                        provider_slug=provider_slug,
                        model_name=provider.model_name,
                        attempt=attempt_number,
                        status="failed",
                        latency_ms=int((perf_counter() - started_at) * 1000),
                        error=f"{type(exc).__name__}: {exc}",
                    )
                )
                continue

            attempts.append(
                ProviderAttempt(
                    provider_slug=provider_slug,
                    model_name=result.model_name,
                    attempt=attempt_number,
                    status="success",
                    latency_ms=int((perf_counter() - started_at) * 1000),
                )
            )
            return GatewayExecution(
                result=result,
                attempts=tuple(attempts),
                selected_provider_slug=provider_slug,
                used_fallback=provider_slug != plan.primary_provider_slug,
            )

    raise ProviderGatewayError(
        "nenhum provider do plano conseguiu executar a solicitação",
        tuple(attempts),
    )
