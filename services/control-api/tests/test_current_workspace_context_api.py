from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import Message, Project, Workspace


client = TestClient(app)


def unique_email() -> str:
    return f"workspace-context-{uuid4().hex}@orbeone.test"


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register_user() -> tuple[str, dict]:
    response = client.post(
        "/v1/auth/register",
        json={
            "email": unique_email(),
            "name": "Tom",
            "password": "senha-segura-123",
        },
    )

    assert response.status_code == 201

    data = response.json()

    return data["access_token"], data["user"]


def test_workspace_route_uses_authenticated_membership() -> None:
    token, user = register_user()

    response = client.get("/v1/workspace", headers=auth_headers(token))

    assert response.status_code == 200

    data = response.json()

    assert data["id"]
    assert data["slug"] == "orbeone"

    me = client.get("/v1/auth/me", headers=auth_headers(token))

    assert me.status_code == 200
    assert me.json()["id"] == user["id"]


def test_projects_are_created_inside_current_workspace() -> None:
    token, _ = register_user()

    workspace = client.get("/v1/workspace", headers=auth_headers(token)).json()

    create = client.post(
        "/v1/projects",
        headers=auth_headers(token),
        json={
            "name": "Projeto Auth Workspace",
            "slug": f"auth-workspace-{uuid4().hex}",
            "product": "orbeAI",
            "description": "Projeto criado via current_workspace.",
        },
    )

    assert create.status_code == 201

    project = create.json()

    assert project["workspace_id"] == workspace["id"]

    listed = client.get("/v1/projects", headers=auth_headers(token))

    assert listed.status_code == 200
    assert any(item["id"] == project["id"] for item in listed.json())


def test_project_from_other_workspace_is_not_visible() -> None:
    token, _ = register_user()

    db = SessionLocal()

    try:
        foreign_workspace = Workspace(
            name="Outro workspace",
            slug=f"foreign-{uuid4().hex}",
            plan="internal",
        )

        db.add(foreign_workspace)
        db.flush()

        foreign_project = Project(
            workspace_id=foreign_workspace.id,
            name="Projeto estrangeiro",
            slug=f"foreign-project-{uuid4().hex}",
            product="orbeAI",
            status="active",
        )

        db.add(foreign_project)
        db.commit()
        db.refresh(foreign_project)

        response = client.get(
            f"/v1/projects/{foreign_project.id}",
            headers=auth_headers(token),
        )

        assert response.status_code == 404
    finally:
        db.close()


def test_chat_send_uses_authenticated_workspace_metadata() -> None:
    token, user = register_user()

    workspace = client.get("/v1/workspace", headers=auth_headers(token)).json()

    response = client.post(
        "/v1/chat/send",
        headers=auth_headers(token),
        json={
            "content": "teste current workspace no runtime",
            "model_preference": "auto",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["chat_id"]

    db = SessionLocal()

    try:
        user_message = db.scalar(
            select(Message).where(Message.id == data["user_message"]["id"])
        )

        assert user_message is not None
        assert user_message.meta["auth_user_id"] == user["id"]
        assert user_message.meta["auth_workspace_id"] == workspace["id"]
    finally:
        db.close()
