from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_send_uses_workspace_defaults_when_mode_and_model_are_omitted() -> None:
    settings_response = client.patch(
        "/v1/workspace/settings",
        json={
            "default_chat_mode": "dev",
            "default_model_preference": "mock",
        },
    )

    assert settings_response.status_code == 200

    send_response = client.post(
        "/v1/chat/send",
        json={
            "content": "teste de defaults do workspace",
        },
    )

    assert send_response.status_code == 201

    data = send_response.json()
    chat_id = data["chat_id"]

    chats_response = client.get("/v1/chats")
    assert chats_response.status_code == 200

    chat = next(item for item in chats_response.json() if item["id"] == chat_id)

    assert chat["mode"] == "dev"
    assert chat["model_preference"] == "mock"

    message_response = client.get(f"/v1/messages/{data['user_message']['id']}")
    assert message_response.status_code == 200

    message = message_response.json()

    assert message["meta"]["requested_mode"] is None
    assert message["meta"]["requested_model_preference"] is None
    assert message["meta"]["resolved_mode"] == "dev"
    assert message["meta"]["resolved_model_preference"] == "mock"

    reset_response = client.patch(
        "/v1/workspace/settings",
        json={
            "default_chat_mode": "strategist",
            "default_model_preference": "auto",
        },
    )

    assert reset_response.status_code == 200


def test_chat_send_keeps_explicit_request_over_workspace_defaults() -> None:
    settings_response = client.patch(
        "/v1/workspace/settings",
        json={
            "default_chat_mode": "dev",
            "default_model_preference": "mock",
        },
    )

    assert settings_response.status_code == 200

    send_response = client.post(
        "/v1/chat/send",
        json={
            "content": "teste de preferência explícita",
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert send_response.status_code == 201

    data = send_response.json()
    chat_id = data["chat_id"]

    chats_response = client.get("/v1/chats")
    assert chats_response.status_code == 200

    chat = next(item for item in chats_response.json() if item["id"] == chat_id)

    assert chat["mode"] == "strategist"
    assert chat["model_preference"] == "auto"

    reset_response = client.patch(
        "/v1/workspace/settings",
        json={
            "default_chat_mode": "strategist",
            "default_model_preference": "auto",
        },
    )

    assert reset_response.status_code == 200
