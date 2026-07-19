from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter
from uuid import uuid4

from app.core.config import get_settings
from app.services.orbe_router import ExecutionPlan, ExecutionStrategy
from app.services.provider_attempt_records import persist_gateway_attempt_records
from app.services.provider_registry import (
    ProviderRegistry,
    build_provider_registry,
    resolve_registry_workspace_id,
)
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
    failure_kind: str | None = None
    error_type: str | None = None

    def persisted_payload(self) -> dict[str, object]:
        return {
            "provider_slug": self.provider_slug,
            "model_name": self.model_name,
            "attempt": self.attempt,
            "status": self.status,
            "latency_ms": self.latency_ms,
            "error": self.error,
            "state_reason": self.state_reason,
            "failure_kind": self.failure_kind,
            "error_type": self.error_type,
        }


@dataclass(frozen=True)
class GatewayExecution:
    result: ProviderExecutionResult
    attempts: tuple[ProviderAttempt, ...]
    selected_provider_slug: str
    used_fallback: bool
    correlation_id: str

    def attempts_payload(self) -> list[dict[str, object]]:
        return [attempt.persisted_payload() for attempt in self.attempts]


class ProviderGatewayError(RuntimeError):
    def __init__(
        self,
        message: str,
        attempts: tuple[ProviderAttempt, ...],
        correlation_id: str,
    ) -> None:
        super().__init__(message)
        self.attempts = attempts
        self.correlation_id = correlation_id


def classify_provider_failure(exc: Exception) -> str:
    error_type = type(exc).__name__.lower()
    message = str(exc).lower()
    combined = f"{error_type} {message}"

    if "timeout" in combined or "timed out" in combined:
        return "timeout"
    if "rate limit" in combined or "ratelimit" in combined or "429" in combined:
        return "rate_limit"
    if any(
        signal in combined
        for signal in ("authentication", "unauthorized", "forbidden", "api key", "401", "403")
    ):
        return "authentication"
    if any(signal in combined for signal in ("connection", "connecterror", "network")):
        return "connection"
    return "provider_error"


def _persist_attempts(
    workspace_id: str | None,
    correlation_id: str,
    attempts: list[ProviderAttempt],
) -> None:
    if workspace_id is None:
        return
    persist_gateway_attempt_records(
        workspace_id=workspace_id,
        correlation_id=correlation_id,
        attempts=[attempt.persisted_payload() for attempt in attempts],
    )


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
    workspace_id = resolve_registry_workspace_id(workspace_id)
    registry = registry or build_provider_registry(
        settings,
        real_providers_enabled=real_providers_enabled,
        workspace_id=workspace_id,
    )
    correlation_id = f"gw_{uuid4().hex}"
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
                    failure_kind="not_executable",
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
                error_type = type(exc).__name__
                attempts.append(
                    ProviderAttempt(
                        provider_slug=provider_slug,
                        model_name=provider.model_name,
                        attempt=attempt_number,
                        status="failed",
                        latency_ms=int((perf_counter() - started_at) * 1000),
                        error=f"{error_type}: provider execution failed",
                        failure_kind=classify_provider_failure(exc),
                        error_type=error_type,
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
            _persist_attempts(workspace_id, correlation_id, attempts)
            return GatewayExecution(
                result=result,
                attempts=tuple(attempts),
                selected_provider_slug=provider_slug,
                used_fallback=provider_slug != plan.primary_provider_slug,
                correlation_id=correlation_id,
            )

    _persist_attempts(workspace_id, correlation_id, attempts)
    raise ProviderGatewayError(
        "nenhum provider do plano conseguiu executar a solicitação",
        tuple(attempts),
        correlation_id,
    )
