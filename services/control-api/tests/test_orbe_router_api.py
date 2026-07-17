from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_router_resolve_uses_mock_executor_with_primary_provider_decision() -> None:
    response = client.post(
        "/v1/router/resolve",
        json={
            "content": "preciso debugar uma api em python",
            "mode": "dev",
            "model_preference": "auto",
        },
    )

    assert response.status_code == 200
    decision = response.json()

    assert decision["provider_slug"] == "mock"
    assert decision["provider_name"] == "orbe-mock"
    assert decision["model_name"] == "orbe-mock-v0"
    assert decision["primary_provider_slug"] == "openai"
    assert decision["is_fallback"] is True
    assert "código" in decision["task_hints"]


def test_chat_send_records_router_reason_in_model_run() -> None:
    send_response = client.post(
        "/v1/chat/send",
        json={
            "title": "Chat com orbeRouter backend",
            "content": "monte um roadmap estratégico para a orbeAI",
            "mode": "strategist",
            "model_preference": "auto",
        },
    )

    assert send_response.status_code == 201
    sent = send_response.json()

    model_run_response = client.get(f"/v1/model-runs/{sent['model_run_id']}")

    assert model_run_response.status_code == 200
    model_run = model_run_response.json()

    assert model_run["provider_name"] == "orbe-mock"
    assert model_run["model_name"] == "orbe-mock-v0"
    assert "orbeRouter" in model_run["router_reason"]
    assert model_run["fallback_chain"]
