from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_message_flow_inside_chat() -> None:
    project_slug = f"orbeai-message-project-{uuid4().hex[:8]}"

    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Projeto para teste de mensagem",
            "slug": project_slug,
            "product": "orbeAI",
            "description": "Projeto usado pelo teste de messages.",
        },
    )

    assert project_response.status_code == 201
    project = project_response.json()

    chat_response = client.post(
        "/v1/chats",
        json={
            "title": "Chat para teste de mensagem",
            "project_id": project["id"],
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert chat_response.status_code == 201
    chat = chat_response.json()

    create_response = client.post(
        f"/v1/chats/{chat['id']}/messages",
        json={
            "role": "user",
            "content": "qual é o próximo passo da orbeAI?",
            "provider": None,
            "model": None,
            "meta": {
                "source": "integration-test",
                "product": "orbeAI",
            },
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["id"]
    assert created["chat_id"] == chat["id"]
    assert created["role"] == "user"
    assert created["content"] == "qual é o próximo passo da orbeAI?"
    assert created["meta"]["source"] == "integration-test"

    message_id = created["id"]

    list_response = client.get(f"/v1/chats/{chat['id']}/messages")

    assert list_response.status_code == 200
    listed = list_response.json()

    assert any(message["id"] == message_id for message in listed)

    get_response = client.get(f"/v1/messages/{message_id}")

    assert get_response.status_code == 200
    fetched = get_response.json()

    assert fetched["id"] == message_id
    assert fetched["chat_id"] == chat["id"]


def test_message_requires_existing_chat() -> None:
    response = client.post(
        "/v1/chats/chat_inexistente/messages",
        json={
            "role": "user",
            "content": "mensagem perdida no vazio",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Chat not found"
