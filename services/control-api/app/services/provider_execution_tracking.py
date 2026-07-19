from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ModelRun
from app.services.orbe_router import RouterDecision
from app.services.provider_attempt_records import associate_gateway_attempt_records
from app.services.provider_gateway import GatewayExecution, ProviderGatewayError


def associate_successful_gateway_execution(
    db: Session,
    *,
    workspace_id: str,
    chat_id: str,
    message_id: str,
    model_run_id: str,
    execution: GatewayExecution | None = None,
    correlation_id: str | None = None,
) -> int:
    resolved_correlation_id = correlation_id or (execution.correlation_id if execution else None)
    return associate_gateway_attempt_records(
        db,
        workspace_id=workspace_id,
        correlation_id=resolved_correlation_id,
        chat_id=chat_id,
        message_id=message_id,
        model_run_id=model_run_id,
    )


def create_failed_gateway_model_run(
    db: Session,
    *,
    workspace_id: str,
    chat_id: str,
    message_id: str,
    task_type: str,
    latency_ms: int,
    decision: RouterDecision,
    error: ProviderGatewayError,
) -> tuple[ModelRun, int]:
    last_attempt = error.attempts[-1] if error.attempts else None
    model_run = ModelRun(
        workspace_id=workspace_id,
        chat_id=chat_id,
        message_id=message_id,
        provider_name=(last_attempt.provider_slug if last_attempt else decision.primary_provider_slug),
        model_name=(last_attempt.model_name if last_attempt else decision.primary_model_name),
        task_type=task_type,
        status="failed",
        latency_ms=max(0, latency_ms),
        input_tokens=None,
        output_tokens=None,
        estimated_cost_usd=None,
        router_reason=decision.reason,
        fallback_chain=decision.fallback_chain,
        error_message="provider_gateway_exhausted",
    )
    db.add(model_run)
    db.flush()
    associated_count = associate_gateway_attempt_records(
        db,
        workspace_id=workspace_id,
        correlation_id=error.correlation_id,
        chat_id=chat_id,
        message_id=message_id,
        model_run_id=model_run.id,
    )
    return model_run, associated_count
