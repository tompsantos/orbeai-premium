from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_project_crud_flow() -> None:
    slug = f"orbeai-test-{uuid4().hex[:8]}"

    create_response = client.post(
        "/v1/projects",
        json={
            "name": "Projeto de teste orbeAI",
            "slug": slug,
            "product": "orbeAI",
            "description": "Projeto criado pelo teste de integração.",
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["id"]
    assert created["workspace_id"]
    assert created["name"] == "Projeto de teste orbeAI"
    assert created["slug"] == slug
    assert created["status"] == "active"

    project_id = created["id"]

    list_response = client.get("/v1/projects")

    assert list_response.status_code == 200
    listed = list_response.json()

    assert any(project["id"] == project_id for project in listed)

    get_response = client.get(f"/v1/projects/{project_id}")

    assert get_response.status_code == 200
    assert get_response.json()["id"] == project_id

    update_response = client.patch(
        f"/v1/projects/{project_id}",
        json={
            "status": "paused",
            "description": "Projeto atualizado pelo teste de integração.",
        },
    )

    assert update_response.status_code == 200
    updated = update_response.json()

    assert updated["id"] == project_id
    assert updated["status"] == "paused"
    assert updated["description"] == "Projeto atualizado pelo teste de integração."
