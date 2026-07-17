from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_memory_crud_and_filters() -> None:
    create_response = client.post(
        "/v1/memories",
        json={
            "label": "Preferência de resposta",
            "content": "Responder de forma direta e prática.",
            "scope": "global",
            "status": "pendente",
            "source_type": "manual",
        },
    )

    assert create_response.status_code == 201
    memory = create_response.json()

    assert memory["label"] == "Preferência de resposta"
    assert memory["status"] == "pendente"

    list_response = client.get("/v1/memories?status=pendente&q=prática")
    assert list_response.status_code == 200
    assert any(item["id"] == memory["id"] for item in list_response.json())

    update_response = client.patch(
        f"/v1/memories/{memory['id']}",
        json={
            "status": "ativa",
            "confidence": 0.95,
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["status"] == "ativa"
    assert updated["confidence"] == 0.95

    delete_response = client.delete(f"/v1/memories/{memory['id']}")
    assert delete_response.status_code == 204

    missing_response = client.get(f"/v1/memories/{memory['id']}")
    assert missing_response.status_code == 404
