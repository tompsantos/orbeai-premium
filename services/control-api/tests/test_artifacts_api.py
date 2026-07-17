from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_artifact_crud_and_versions() -> None:
    create_response = client.post(
        "/v1/artifacts",
        json={
            "title": "Plano executivo",
            "kind": "documento",
            "content": "versão inicial",
        },
    )

    assert create_response.status_code == 201
    artifact = create_response.json()

    assert artifact["title"] == "Plano executivo"
    assert artifact["versions"][0]["content"] == "versão inicial"
    assert artifact["versions"][0]["version_number"] == 1

    version_response = client.post(
        f"/v1/artifacts/{artifact['id']}/versions",
        json={
            "content": "segunda versão",
            "note": "Revisão",
        },
    )

    assert version_response.status_code == 201
    version = version_response.json()
    assert version["version_number"] == 2

    get_response = client.get(f"/v1/artifacts/{artifact['id']}")
    assert get_response.status_code == 200

    updated = get_response.json()
    assert len(updated["versions"]) == 2

    delete_response = client.delete(f"/v1/artifacts/{artifact['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/v1/artifacts/{artifact['id']}")
    assert missing_response.status_code == 404
