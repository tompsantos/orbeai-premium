from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def set_flag(key: str, enabled: bool) -> None:
    response = client.patch(f"/v1/feature-flags/{key}", json={"enabled": enabled})
    assert response.status_code == 200


def test_chat_send_creates_explicit_memory() -> None:
    set_flag("auto_memory", True)

    marker = uuid4().hex
    content = f"lembre que meu formato preferido é resposta objetiva em tópicos curtos {marker}"

    response = client.post(
        "/v1/chat/send",
        json={
            "content": content,
            "mode": "strategist",
            "model_preference": "mock",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["memory_events"]
    assert data["memory_events"][0]["status"] == "ativa"

    memories_response = client.get(f"/v1/memories?q={marker}")
    assert memories_response.status_code == 200

    memories = memories_response.json()
    assert any(marker in item["content"] for item in memories)


def test_chat_send_ignores_non_relevant_memory() -> None:
    set_flag("auto_memory", True)

    response = client.post(
        "/v1/chat/send",
        json={
            "content": "qual é a diferença entre json e yaml?",
            "mode": "dev",
            "model_preference": "mock",
        },
    )

    assert response.status_code == 201
    assert response.json()["memory_events"] == []
