import pytest
from sqlalchemy import delete, select

from app.db.session import SessionLocal
from app.models import ProviderAttemptRecord
from app.services.orbe_router import ExecutionPlan, ExecutionStrategy, RouteKind
from app.services.provider_gateway import ProviderGatewayError, execute_provider_plan
from app.services.provider_registry import ProviderModel, ProviderRegistry, ProviderState


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
