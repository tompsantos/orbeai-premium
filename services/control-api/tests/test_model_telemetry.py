from sqlalchemy import delete

from app.core.config import Settings
from app.db.session import SessionLocal
from app.models import ModelRun, ProviderAttemptRecord
from app.services.bootstrap import get_or_create_default_workspace
from app.services.model_profiles import build_model_profile
from app.services.model_telemetry import build_model_telemetry_map
from app.services.provider_registry import ProviderModel, ProviderState


def _profile(model_name: str):
    return build_model_profile(
        ProviderModel(
            provider_slug="openai",
            provider_name="OpenAI",
            model_name=model_name,
            state=ProviderState.CONFIGURED,
            state_reason="pytest",
            capabilities=("text_chat", "direct_execution", "stream_emulation"),
            is_real=True,
            credential_source="environment",
            key_hint="••••test",
        )
    )


def test_model_telemetry_uses_attempts_and_model_runs() -> None:
    model_name = "telemetry-openai-test-model"
    request_prefix = "gw_telemetry_test"

    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        try:
            attempts = [
                ProviderAttemptRecord(
                    workspace_id=workspace.id,
                    request_id=f"{request_prefix}_1",
                    provider_slug="openai",
                    model_name=model_name,
                    attempt=1,
                    status="success",
                    latency_ms=100,
                ),
                ProviderAttemptRecord(
                    workspace_id=workspace.id,
                    request_id=f"{request_prefix}_2",
                    provider_slug="openai",
                    model_name=model_name,
                    attempt=1,
                    status="failed",
                    latency_ms=200,
                    failure_kind="timeout",
                    error_type="TimeoutError",
                ),
                ProviderAttemptRecord(
                    workspace_id=workspace.id,
                    request_id=f"{request_prefix}_3",
                    provider_slug="openai",
                    model_name=model_name,
                    attempt=1,
                    status="success",
                    latency_ms=300,
                ),
                ProviderAttemptRecord(
                    workspace_id=workspace.id,
                    request_id=f"{request_prefix}_4",
                    provider_slug="openai",
                    model_name=model_name,
                    attempt=1,
                    status="failed",
                    latency_ms=400,
                    failure_kind="provider_error",
                    error_type="RuntimeError",
                ),
                ProviderAttemptRecord(
                    workspace_id=workspace.id,
                    request_id=f"{request_prefix}_5",
                    provider_slug="openai",
                    model_name=model_name,
                    attempt=0,
                    status="skipped",
                    latency_ms=0,
                    failure_kind="not_executable",
                ),
            ]
            runs = [
                ModelRun(
                    workspace_id=workspace.id,
                    provider_name="openai",
                    model_name=model_name,
                    task_type="pytest.telemetry",
                    status="success",
                    latency_ms=100,
                    input_tokens=100,
                    output_tokens=40,
                    estimated_cost_usd=0.001,
                ),
                ModelRun(
                    workspace_id=workspace.id,
                    provider_name="openai",
                    model_name=model_name,
                    task_type="pytest.telemetry",
                    status="success",
                    latency_ms=300,
                    input_tokens=200,
                    output_tokens=60,
                    estimated_cost_usd=0.002,
                ),
            ]
            db.add_all([*attempts, *runs])
            db.commit()

            settings = Settings(
                _env_file=None,
                OPENAI_INPUT_PRICE_PER_M_TOKENS=1.0,
                OPENAI_OUTPUT_PRICE_PER_M_TOKENS=2.0,
            )
            profile = _profile(model_name)
            telemetry = build_model_telemetry_map(
                db,
                workspace_id=workspace.id,
                profiles=(profile,),
                window_days=30,
                settings=settings,
            )[("openai", model_name)]

            assert telemetry.attempt_sample_count == 5
            assert telemetry.executed_attempt_count == 4
            assert telemetry.success_count == 2
            assert telemetry.failure_count == 2
            assert telemetry.skipped_count == 1
            assert telemetry.timeout_count == 1
            assert telemetry.success_rate == 0.5
            assert telemetry.timeout_rate == 0.25
            assert telemetry.latency_p50_ms == 250
            assert telemetry.latency_p95_ms == 385
            assert telemetry.run_sample_count == 2
            assert telemetry.token_sample_count == 2
            assert telemetry.input_tokens_total == 300
            assert telemetry.output_tokens_total == 100
            assert telemetry.cost_status == "configured"
            assert telemetry.cost_sample_count == 2
            assert telemetry.estimated_cost_usd_total == 0.003
            assert telemetry.last_attempt_at is not None
        finally:
            db.execute(
                delete(ProviderAttemptRecord).where(
                    ProviderAttemptRecord.request_id.like(f"{request_prefix}%")
                )
            )
            db.execute(
                delete(ModelRun)
                .where(ModelRun.workspace_id == workspace.id)
                .where(ModelRun.model_name == model_name)
            )
            db.commit()


def test_model_telemetry_does_not_claim_unconfigured_cost() -> None:
    model_name = "telemetry-no-price-test-model"

    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        profile = _profile(model_name)
        telemetry = build_model_telemetry_map(
            db,
            workspace_id=workspace.id,
            profiles=(profile,),
            window_days=7,
            settings=Settings(_env_file=None),
        )[("openai", model_name)]

    assert telemetry.cost_status == "not_configured"
    assert telemetry.cost_sample_count == 0
    assert telemetry.estimated_cost_usd_total is None
