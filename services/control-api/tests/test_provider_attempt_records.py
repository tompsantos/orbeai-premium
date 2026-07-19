from datetime import timedelta

import pytest
from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models import Chat, Message, ModelRun, ProviderAttemptRecord, Workspace
from app.models.core import utc_now
from app.services.bootstrap import get_or_create_default_workspace
from app.services.orbe_router import ExecutionPlan, ExecutionStrategy, RouteKind
from app.services.provider_attempt_records import (
    associate_gateway_attempt_records,
    purge_expired_provider_attempt_records,
)
from app.services.provider_gateway import ProviderGatewayError, execute_provider_plan
from app.services.provider_registry import ProviderModel, ProviderRegistry, ProviderState
from app.services.providers.real import ProviderExecutionResult


def _registry() -> ProviderRegistry:
    return ProviderRegistry(
        providers={
            "openai": ProviderModel(
                provider_slug="openai",
                provider_name="OpenAI",
                model_name="attempt-record-test-model",
                state=ProviderState.CONFIGURED,
                state_reason="pytest",
                capabilities=("text_chat", "direct_execution"),
                is_real=True,
                credential_source="environment",
                key_hint="••••test",
            )
        }
    )


def _plan() -> ExecutionPlan:
    return ExecutionPlan(
        strategy=ExecutionStrategy.DIRECT_PROVIDER,
        route_kind=RouteKind.DIRECT_MODEL,
        primary_provider_slug="openai",
        provider_chain=("openai",),
        model_by_provider={"openai": "attempt-record-test-model"},
        capability_ids=("direct_text_response",),
        timeout_seconds=5.0,
        retry_attempts=0,
        allow_mock=False,
        implemented=True,
    )


def test_gateway_persists_terminal_failure_without_raw_error(monkeypatch) -> None:
    def fail_provider(**kwargs: object):
        raise TimeoutError("secret-provider-detail-that-must-not-be-persisted")

    monkeypatch.setattr(
        "app.services.provider_gateway.execute_provider",
        fail_provider,
    )

    with pytest.raises(ProviderGatewayError) as captured:
        execute_provider_plan(
            _plan(),
            content="teste de falha terminal",
            mode="strategist",
            model_preference="auto",
            registry=_registry(),
        )

    correlation_id = captured.value.correlation_id
    with SessionLocal() as db:
        try:
            records = list(
                db.scalars(
                    select(ProviderAttemptRecord).where(
                        ProviderAttemptRecord.request_id == correlation_id
                    )
                )
            )

            assert len(records) == 1
            assert records[0].status == "failed"
            assert records[0].failure_kind == "timeout"
            assert records[0].error_type == "TimeoutError"
            assert not hasattr(records[0], "error_message")
        finally:
            db.execute(
                delete(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id == correlation_id
                )
            )
            db.commit()


def test_gateway_attempt_is_born_with_chat_and_message_and_later_gets_model_run(
    monkeypatch,
) -> None:
    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        chat = Chat(workspace_id=workspace.id, title="correlation-test")
        db.add(chat)
        db.flush()
        user_message = Message(chat_id=chat.id, role="user", content="teste")
        db.add(user_message)
        db.commit()
        db.refresh(chat)
        db.refresh(user_message)
        workspace_id = workspace.id
        chat_id = chat.id
        message_id = user_message.id

    def succeed_provider(**kwargs: object) -> ProviderExecutionResult:
        return ProviderExecutionResult(
            content="ok",
            provider_name="openai",
            model_name="attempt-record-test-model",
            input_tokens=4,
            output_tokens=2,
            latency_ms=1,
            estimated_cost_usd=0.0,
        )

    monkeypatch.setattr(
        "app.services.provider_gateway.execute_provider",
        succeed_provider,
    )
    execution = execute_provider_plan(
        _plan(),
        content="teste",
        mode="strategist",
        model_preference="auto",
        registry=_registry(),
        workspace_id=workspace_id,
        chat_id=chat_id,
        message_id=message_id,
    )

    with SessionLocal() as db:
        try:
            record = db.scalar(
                select(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id == execution.correlation_id
                )
            )
            assert record is not None
            assert record.chat_id == chat_id
            assert record.message_id == message_id
            assert record.model_run_id is None

            model_run = ModelRun(
                workspace_id=workspace_id,
                chat_id=chat_id,
                message_id=message_id,
                provider_name="openai",
                model_name="attempt-record-test-model",
                status="success",
            )
            db.add(model_run)
            db.flush()
            associated = associate_gateway_attempt_records(
                db,
                workspace_id=workspace_id,
                correlation_id=execution.correlation_id,
                chat_id=chat_id,
                message_id=message_id,
                model_run_id=model_run.id,
            )
            db.commit()

            db.refresh(record)
            assert associated == 1
            assert record.model_run_id == model_run.id
        finally:
            db.execute(
                delete(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id == execution.correlation_id
                )
            )
            db.execute(delete(ModelRun).where(ModelRun.chat_id == chat_id))
            db.execute(delete(Message).where(Message.chat_id == chat_id))
            db.execute(delete(Chat).where(Chat.id == chat_id))
            db.commit()


def test_retention_purges_only_expired_records_from_requested_workspace() -> None:
    now = utc_now()
    other_workspace_id: str | None = None
    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        other_workspace = Workspace(
            name="Retention Other",
            slug=f"retention-other-{now.timestamp()}",
            plan="internal",
        )
        db.add(other_workspace)
        db.flush()
        other_workspace_id = other_workspace.id

        records = [
            ProviderAttemptRecord(
                workspace_id=workspace.id,
                request_id="retention-old-target",
                provider_slug="openai",
                model_name="test-model",
                attempt=1,
                status="success",
                latency_ms=1,
                created_at=now - timedelta(days=40),
            ),
            ProviderAttemptRecord(
                workspace_id=workspace.id,
                request_id="retention-new-target",
                provider_slug="openai",
                model_name="test-model",
                attempt=1,
                status="success",
                latency_ms=1,
                created_at=now - timedelta(days=5),
            ),
            ProviderAttemptRecord(
                workspace_id=other_workspace.id,
                request_id="retention-old-other",
                provider_slug="openai",
                model_name="test-model",
                attempt=1,
                status="success",
                latency_ms=1,
                created_at=now - timedelta(days=40),
            ),
        ]
        db.add_all(records)
        db.commit()

        deleted_count = purge_expired_provider_attempt_records(
            db,
            workspace_id=workspace.id,
            retention_days=30,
            now=now,
        )
        db.commit()

        remaining_ids = set(
            db.scalars(
                select(ProviderAttemptRecord.request_id).where(
                    ProviderAttemptRecord.request_id.in_(
                        {
                            "retention-old-target",
                            "retention-new-target",
                            "retention-old-other",
                        }
                    )
                )
            )
        )
        assert deleted_count == 1
        assert remaining_ids == {"retention-new-target", "retention-old-other"}

        db.execute(
            delete(ProviderAttemptRecord).where(
                ProviderAttemptRecord.request_id.in_(
                    {"retention-new-target", "retention-old-other"}
                )
            )
        )
        db.execute(delete(Workspace).where(Workspace.id == other_workspace_id))
        db.commit()
