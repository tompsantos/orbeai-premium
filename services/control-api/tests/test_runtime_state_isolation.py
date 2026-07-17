from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_runtime_state_starts_with_safe_defaults() -> None:
    workspace_response = client.get("/v1/workspace")
    assert workspace_response.status_code == 200

    workspace = workspace_response.json()
    settings = workspace["settings"]

    assert settings["default_chat_mode"] == "strategist"
    assert settings["default_model_preference"] == "auto"
    assert settings["memory_policy"] == "balanced"
    assert settings["allow_exports"] is True
    assert settings["allow_public_sharing"] is False

    flags_response = client.get("/v1/feature-flags")
    assert flags_response.status_code == 200

    flags = {flag["key"]: flag["enabled"] for flag in flags_response.json()}

    assert flags["real_providers"] is True
    assert flags["auto_memory"] is True
    assert flags["memory_context"] is True
    assert flags["audit_logs"] is True
    assert flags["artifact_versions"] is True


def test_runtime_state_can_be_mutated_inside_a_test() -> None:
    settings_response = client.patch(
        "/v1/workspace/settings",
        json={
            "default_chat_mode": "dev",
            "default_model_preference": "mock",
            "memory_policy": "strict",
            "allow_exports": False,
            "allow_public_sharing": True,
        },
    )

    assert settings_response.status_code == 200

    toggle_response = client.post("/v1/feature-flags/auto_memory/toggle")
    assert toggle_response.status_code == 200
    assert toggle_response.json()["enabled"] is False
