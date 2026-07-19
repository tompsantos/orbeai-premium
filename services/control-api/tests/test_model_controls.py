from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app
from app.routers import model_providers as model_providers_router
from app.services.model_controls import model_control_key
from app.services.provider_registry import ProviderState, build_provider_registry

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
