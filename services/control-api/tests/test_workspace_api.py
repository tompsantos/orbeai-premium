from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_workspace_get_and_update_settings() -> None:
    get_response = client.get("/v1/workspace")

    assert get_response.status_code == 200

    workspace = get_response.json()

    assert workspace["slug"] == "orbeone"
    assert workspace["settings"]["locale"] == "pt-BR"

    update_response = client.patch(
        "/v1/workspace/settings",
        json={
            "timezone": "America/Sao_Paulo",
            "default_chat_mode": "dev",
            "default_model_preference": "auto",
            "memory_policy": "balanced",
            "data_retention_days": 730,
            "allow_exports": True,
            "allow_public_sharing": False,
        },
    )

    assert update_response.status_code == 200

    settings = update_response.json()

    assert settings["default_chat_mode"] == "dev"
    assert settings["data_retention_days"] == 730

    audit_response = client.get("/v1/audit-logs?q=workspace.settings.update")

    assert audit_response.status_code == 200
    assert any(log["action"] == "workspace.settings.update" for log in audit_response.json())


def test_workspace_update_name_and_plan() -> None:
    response = client.patch(
        "/v1/workspace",
        json={
            "name": "orbeOne",
            "plan": "internal",
        },
    )

    assert response.status_code == 200

    workspace = response.json()

    assert workspace["name"] == "orbeOne"
    assert workspace["plan"] == "internal"
