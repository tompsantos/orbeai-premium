from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from app.core.config import Settings
from app.db.session import SessionLocal
from app.main import app
from app.models import AuditLog, ProviderAttemptRecord
from app.models.core import utc_now
from app.routers import model_providers as model_providers_router
from app.services.bootstrap import get_or_create_default_workspace
from app.services.model_controls import model_control_key
from app.services.provider_registry import ProviderState, build_provider_registry
from app.services.workspace_settings import get_or_create_workspace_settings

client = TestClient(app)


def _profiles_enabled(**kwargs: object) -> bool:
    return str(kwargs["key"]) in {"router_model_profiles", "real_providers"}


def test_registry_excludes_workspace_disabled_model_from_execution_chain() -> None:
    settings = Settings(
        _env_file=None,
        ENABLE_REAL_PROVIDERS=True,
        OPENAI_API_KEY="pytest-openai",
        GEMINI_API_KEY="pytest-gemini",
        OPENAI_MODEL="openai-control-test",
        GEMINI_MODEL="gemini-control-test",
    )
    controls = {
        model_control_key("openai", "openai-control-test"): False,
    }

    registry = build_provider_registry(
        settings,
        workspace_model_controls=controls,
    )

    openai = registry.get("openai")
    assert openai.workspace_enabled is False
    assert openai.state is ProviderState.DISABLED
    assert openai.state_reason == "workspace_model_disabled"
    assert openai.executable is False
    assert registry.execution_chain("openai") == ["gemini", "mock"]


def test_model_control_api_persists_and_changes_effective_profile(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        _profiles_enabled,
    )

    controls_response = client.get("/v1/model-providers/controls")
    assert controls_response.status_code == 200
    controls = controls_response.json()
    openai = next(control for control in controls if control["provider_slug"] == "openai")

    update_response = client.put(
        "/v1/model-providers/controls",
        json={
            "provider_slug": "openai",
            "model_name": openai["model_name"],
            "enabled": False,
        },
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["enabled"] is False
    assert updated["effective_state"] == "disabled"
    assert updated["state_reason"] == "workspace_model_disabled"
    assert updated["executable"] is False
    assert updated["updated_by"] == "usr_pytest_auth"

    profiles_response = client.get("/v1/model-providers/profiles")
    assert profiles_response.status_code == 200
    profile = next(
        item
        for item in profiles_response.json()
        if item["provider_slug"] == "openai"
    )
    assert profile["workspace_enabled"] is False
    assert profile["executable"] is False
    assert profile["required_capabilities"]
    assert profile["optional_capabilities"] == ["stream_emulation"]


def test_model_control_api_rejects_stale_model_name(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        _profiles_enabled,
    )

    response = client.put(
        "/v1/model-providers/controls",
        json={
            "provider_slug": "openai",
            "model_name": "stale-model-name",
            "enabled": False,
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "Model control does not match the currently registered model"
    }


def test_model_control_api_keeps_one_executable_model(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        _profiles_enabled,
    )

    controls_response = client.get("/v1/model-providers/controls")
    assert controls_response.status_code == 200
    controls = controls_response.json()

    for control in controls:
        if control["provider_slug"] == "mock" or not control["executable"]:
            continue
        response = client.put(
            "/v1/model-providers/controls",
            json={
                "provider_slug": control["provider_slug"],
                "model_name": control["model_name"],
                "enabled": False,
            },
        )
        assert response.status_code == 200

    mock = next(control for control in controls if control["provider_slug"] == "mock")
    response = client.put(
        "/v1/model-providers/controls",
        json={
            "provider_slug": "mock",
            "model_name": mock["model_name"],
            "enabled": False,
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": "At least one model must remain executable in the workspace"
    }


def test_attempt_retention_api_uses_workspace_policy_and_audits(monkeypatch) -> None:
    monkeypatch.setattr(
        model_providers_router,
        "is_feature_enabled",
        _profiles_enabled,
    )
    request_id = "retention-api-expired"
    with SessionLocal() as db:
        workspace = get_or_create_default_workspace(db)
        settings = get_or_create_workspace_settings(db, workspace)
        settings.data_retention_days = 30
        db.add(settings)
        db.add(
            ProviderAttemptRecord(
                workspace_id=workspace.id,
                request_id=request_id,
                provider_slug="openai",
                model_name="retention-api-model",
                attempt=1,
                status="success",
                latency_ms=1,
                created_at=utc_now() - timedelta(days=40),
            )
        )
        db.commit()
        workspace_id = workspace.id

    response = client.post("/v1/model-providers/attempts/retention/run")

    assert response.status_code == 200
    assert response.json() == {
        "retention_days": 30,
        "deleted_records": 1,
        "aggregation_mode": "on_demand_window",
        "max_query_window_days": 90,
    }

    with SessionLocal() as db:
        assert db.scalar(
            select(ProviderAttemptRecord).where(
                ProviderAttemptRecord.request_id == request_id
            )
        ) is None
        audit = db.scalar(
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .where(AuditLog.action == "provider.attempt.retention")
            .order_by(AuditLog.created_at.desc())
        )
        assert audit is not None
        assert audit.meta["retention_days"] == 30
        assert audit.meta["deleted_records"] == 1
        db.execute(
            delete(AuditLog).where(
                AuditLog.workspace_id == workspace_id,
                AuditLog.action == "provider.attempt.retention",
            )
        )
        db.commit()
