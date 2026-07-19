from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models import Chat, Message, ModelRun, ProviderAttemptRecord
from app.services.bootstrap import get_or_create_default_workspace
from app.services.orbe_router import resolve_chat_route
from app.services.provider_attempt_records import persist_gateway_attempt_records
from app.services.provider_execution_tracking import (
    create_failed_gateway_model_run,
    create_gateway_model_run_without_response,
)
from app.services.provider_gateway import (
    GatewayExecution,
    ProviderAttempt,
    ProviderGatewayError,
)
from app.services.providers.real import ProviderExecutionResult


def _turn_entities() -> tuple[str, str, str]:
    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        chat = Chat(workspace_id=workspace.id, title="execution-tracking-test")
        db.add(chat)
        db.flush()
        message = Message(chat_id=chat.id, role="user", content="teste")
        db.add(message)
        db.commit()
        db.refresh(chat)
        db.refresh(message)
        return workspace.id, chat.id, message.id


def _cleanup(chat_id: str) -> None:
    with SessionLocal() as db:
        db.execute(delete(ProviderAttemptRecord).where(ProviderAttemptRecord.chat_id == chat_id))
        db.execute(delete(ModelRun).where(ModelRun.chat_id == chat_id))
        db.execute(delete(Message).where(Message.chat_id == chat_id))
        db.execute(delete(Chat).where(Chat.id == chat_id))
        db.commit()


def test_stopped_execution_without_response_gets_model_run_and_attempt_link() -> None:
    workspace_id, chat_id, message_id = _turn_entities()
    correlation_id = "gw_tracking_stopped"
    attempt = ProviderAttempt(
        provider_slug="mock",
        model_name="orbe-mock-v0",
        attempt=1,
        status="success",
        latency_ms=2,
    )
    persist_gateway_attempt_records(
        workspace_id=workspace_id,
        correlation_id=correlation_id,
        chat_id=chat_id,
        message_id=message_id,
        attempts=[attempt.persisted_payload()],
    )
    decision = resolve_chat_route(
        content="teste simples",
        mode="strategist",
        model_preference="mock",
        cognition_enabled=False,
        workspace_id=workspace_id,
    )
    execution = GatewayExecution(
        result=ProviderExecutionResult(
            content="resposta gerada mas não transmitida",
            provider_name="orbe-mock",
            model_name="orbe-mock-v0",
            input_tokens=5,
            output_tokens=7,
            latency_ms=2,
            estimated_cost_usd=0.0,
        ),
        attempts=(attempt,),
        selected_provider_slug="mock",
        used_fallback=False,
        correlation_id=correlation_id,
    )

    try:
        with SessionLocal() as db:
            model_run, associated = create_gateway_model_run_without_response(
                db,
                workspace_id=workspace_id,
                chat_id=chat_id,
                message_id=message_id,
                task_type="chat.live.direct_provider",
                status="stopped",
                latency_ms=3,
                decision=decision,
                execution=execution,
                error_message="stream_stopped_before_first_delta",
            )
            db.commit()
            db.refresh(model_run)
            record = db.scalar(
                select(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id == correlation_id
                )
            )

            assert associated == 1
            assert model_run.status == "stopped"
            assert model_run.message_id == message_id
            assert model_run.output_tokens == 7
            assert record is not None
            assert record.model_run_id == model_run.id
    finally:
        _cleanup(chat_id)


def test_terminal_failure_gets_failed_model_run_and_attempt_link() -> None:
    workspace_id, chat_id, message_id = _turn_entities()
    correlation_id = "gw_tracking_failed"
    attempt = ProviderAttempt(
        provider_slug="openai",
        model_name="failed-model",
        attempt=1,
        status="failed",
        latency_ms=12,
        failure_kind="timeout",
        error_type="TimeoutError",
    )
    persist_gateway_attempt_records(
        workspace_id=workspace_id,
        correlation_id=correlation_id,
        chat_id=chat_id,
        message_id=message_id,
        attempts=[attempt.persisted_payload()],
    )
    decision = resolve_chat_route(
        content="teste simples",
        mode="strategist",
        model_preference="openai",
        cognition_enabled=False,
        workspace_id=workspace_id,
    )
    error = ProviderGatewayError(
        "provider exhausted",
        attempts=(attempt,),
        correlation_id=correlation_id,
    )

    try:
        with SessionLocal() as db:
            model_run, associated = create_failed_gateway_model_run(
                db,
                workspace_id=workspace_id,
                chat_id=chat_id,
                message_id=message_id,
                task_type="chat.send",
                latency_ms=13,
                decision=decision,
                error=error,
            )
            db.commit()
            db.refresh(model_run)
            record = db.scalar(
                select(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id == correlation_id
                )
            )

            assert associated == 1
            assert model_run.status == "failed"
            assert model_run.error_message == "provider_gateway_exhausted"
            assert model_run.message_id == message_id
            assert record is not None
            assert record.model_run_id == model_run.id
    finally:
        _cleanup(chat_id)
