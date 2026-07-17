from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_chat_crud_flow() -> None:
    project_slug = f"orbeai-chat-project-{uuid4().hex[:8]}"

    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Projeto para teste de chat",
            "slug": project_slug,
            "product": "orbeAI",
            "description": "Projeto usado pelo teste de chats.",
        },
    )

    assert project_response.status_code == 201
    project = project_response.json()

    create_response = client.post(
        "/v1/chats",
        json={
            "title": "Conversa de teste",
            "project_id": project["id"],
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["id"]
    assert created["workspace_id"] == project["workspace_id"]
    assert created["project_id"] == project["id"]
    assert created["title"] == "Conversa de teste"
    assert created["mode"] == "strategist"
    assert created["model_preference"] == "auto"

    chat_id = created["id"]

    list_response = client.get("/v1/chats")

    assert list_response.status_code == 200
    listed = list_response.json()

    assert any(chat["id"] == chat_id for chat in listed)

    filtered_response = client.get(f"/v1/chats?project_id={project['id']}")

    assert filtered_response.status_code == 200
    filtered = filtered_response.json()

    assert any(chat["id"] == chat_id for chat in filtered)

    get_response = client.get(f"/v1/chats/{chat_id}")

    assert get_response.status_code == 200
    assert get_response.json()["id"] == chat_id

    update_response = client.patch(
        f"/v1/chats/{chat_id}",
        json={
            "title": "Conversa atualizada",
            "mode": "technical",
            "model_preference": "gpt-5.5-thinking",
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()

    assert updated["id"] == chat_id
    assert updated["title"] == "Conversa atualizada"
    assert updated["mode"] == "technical"
    assert updated["model_preference"] == "gpt-5.5-thinking"


def test_delete_chat_removes_chat() -> None:
    create_response = client.post(
        "/v1/chats",
        json={
            "title": "Chat temporário para deletar",
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert create_response.status_code == 201
    chat = create_response.json()

    delete_response = client.delete(f"/v1/chats/{chat['id']}")
    assert delete_response.status_code == 204

    get_response = client.get(f"/v1/chats/{chat['id']}")
    assert get_response.status_code == 404
