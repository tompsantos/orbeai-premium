from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_chat_send_creates_chat_user_message_assistant_message_and_model_run() -> None:
    project_slug = f"orbeai-send-project-{uuid4().hex[:8]}"

    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Projeto para teste de chat send",
            "slug": project_slug,
            "product": "orbeAI",
            "description": "Projeto usado pelo teste do chat send.",
        },
    )

    assert project_response.status_code == 201
    project = project_response.json()

    send_response = client.post(
        "/v1/chat/send",
        json={
            "project_id": project["id"],
            "title": "Chat send teste",
            "content": "qual é o próximo passo técnico da orbeAI?",
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert send_response.status_code == 201
    payload = send_response.json()

    assert payload["chat_id"]
    assert payload["provider"] == "orbe-mock"
    assert payload["model"] == "orbe-mock-v0"
    assert payload["model_run_id"]

    user_message = payload["user_message"]
    assistant_message = payload["assistant_message"]

    assert user_message["role"] == "user"
    assert user_message["content"] == "qual é o próximo passo técnico da orbeAI?"

    assert assistant_message["role"] == "assistant"
    assert assistant_message["provider"] == "orbe-mock"
    assert assistant_message["model"] == "orbe-mock-v0"
    assert "provider mock" in assistant_message["content"]

    messages_response = client.get(f"/v1/chats/{payload['chat_id']}/messages")

    assert messages_response.status_code == 200
    messages = messages_response.json()

    assert len(messages) >= 2
    assert any(message["id"] == user_message["id"] for message in messages)
    assert any(message["id"] == assistant_message["id"] for message in messages)


def test_chat_send_reuses_existing_chat() -> None:
    chat_response = client.post(
        "/v1/chats",
        json={
            "title": "Chat reaproveitado",
            "mode": "technical",
            "model_preference": "auto",
        },
    )

    assert chat_response.status_code == 201
    chat = chat_response.json()

    send_response = client.post(
        "/v1/chat/send",
        json={
            "chat_id": chat["id"],
            "content": "continua essa conversa usando o chat existente",
        },
    )

    assert send_response.status_code == 201
    payload = send_response.json()

    assert payload["chat_id"] == chat["id"]
    assert payload["user_message"]["chat_id"] == chat["id"]
    assert payload["assistant_message"]["chat_id"] == chat["id"]
