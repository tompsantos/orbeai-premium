from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def set_flag(key: str, enabled: bool) -> None:
    response = client.patch(f"/v1/feature-flags/{key}", json={"enabled": enabled})
    assert response.status_code == 200


def test_auto_memory_flag_controls_memory_creation() -> None:
    set_flag("auto_memory", False)

    content = f"lembre que teste runtime auto memory {uuid4().hex}"

    response = client.post(
        "/v1/chat/send",
        json={
            "content": content,
            "mode": "strategist",
            "model_preference": "mock",
        },
    )

    assert response.status_code == 201
    assert response.json()["memory_events"] == []

    set_flag("auto_memory", True)

    response_enabled = client.post(
        "/v1/chat/send",
        json={
            "content": f"lembre que teste runtime auto memory ativo {uuid4().hex}",
            "mode": "strategist",
            "model_preference": "mock",
        },
    )

    assert response_enabled.status_code == 201
    assert response_enabled.json()["memory_events"]


def test_real_providers_flag_forces_mock_provider() -> None:
    set_flag("real_providers", False)

    response = client.post(
        "/v1/chat/send",
        json={
            "content": "responda apenas: flag real providers off",
            "mode": "document",
            "model_preference": "openai",
        },
    )

    assert response.status_code == 201
    assert response.json()["provider"] == "orbe-mock"

    set_flag("real_providers", True)


def test_artifact_versions_flag_controls_version_creation() -> None:
    create_response = client.post(
        "/v1/artifacts",
        json={
            "title": f"Artifact flag runtime {uuid4().hex}",
            "kind": "documento",
            "content": "versão inicial",
        },
    )

    assert create_response.status_code == 201
    artifact = create_response.json()

    set_flag("artifact_versions", False)

    version_response = client.post(
        f"/v1/artifacts/{artifact['id']}/versions",
        json={
            "content": "nova versão bloqueada",
            "note": "bloqueio por flag",
        },
    )

    assert version_response.status_code == 403

    set_flag("artifact_versions", True)

    delete_response = client.delete(f"/v1/artifacts/{artifact['id']}")
    assert delete_response.status_code == 204
