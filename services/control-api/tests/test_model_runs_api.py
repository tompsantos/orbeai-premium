from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_model_runs_are_listed_after_chat_send() -> None:
    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Projeto para teste de model runs",
            "slug": f"orbeai-model-runs-{uuid4().hex[:8]}",
            "product": "orbeAI",
            "description": "Projeto usado pelo teste de model_runs.",
        },
    )

    assert project_response.status_code == 201
    project = project_response.json()

    send_response = client.post(
        "/v1/chat/send",
        json={
            "project_id": project["id"],
            "title": "Chat com model run",
            "content": "registre esta execução do provider mock",
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert send_response.status_code == 201
    sent = send_response.json()

    model_run_id = sent["model_run_id"]
    chat_id = sent["chat_id"]

    list_response = client.get(f"/v1/model-runs?chat_id={chat_id}")

    assert list_response.status_code == 200
    model_runs = list_response.json()

    assert any(run["id"] == model_run_id for run in model_runs)

    run = next(run for run in model_runs if run["id"] == model_run_id)

    assert run["provider_name"] == "orbe-mock"
    assert run["model_name"] == "orbe-mock-v0"
    assert run["task_type"] == "chat.send"
    assert run["status"] == "success"
    assert run["estimated_cost_usd"] == 0.0

    get_response = client.get(f"/v1/model-runs/{model_run_id}")

    assert get_response.status_code == 200
    fetched = get_response.json()

    assert fetched["id"] == model_run_id
    assert fetched["chat_id"] == chat_id
