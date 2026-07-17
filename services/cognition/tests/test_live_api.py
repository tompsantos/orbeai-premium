from fastapi.testclient import TestClient

import app.main as main_module
from app.main import app

client = TestClient(app)


def test_capabilities_advertise_live_chat() -> None:
    response = client.get("/v1/capabilities")
    assert response.status_code == 200
    payload = response.json()
    assert payload["streaming"] is True
    assert payload["stop"] is True
    assert payload["approvals"] is True


def test_streaming_turn_emits_sse_events(monkeypatch) -> None:
    def fake_stream(payload, settings):
        yield {
            "type": "run.started",
            "request_id": payload.request_id,
            "chat_id": payload.chat_id,
            "model": "test-model",
        }
        yield {
            "type": "response.delta",
            "request_id": payload.request_id,
            "chat_id": payload.chat_id,
            "delta": "olá",
        }
        yield {
            "type": "response.completed",
            "request_id": payload.request_id,
            "chat_id": payload.chat_id,
            "model": "test-model",
            "final_response": "olá mundo",
            "messages": [],
        }

    monkeypatch.setattr(main_module, "stream_turn", fake_stream)

    response = client.post(
        "/v1/turns/stream",
        json={
            "workspace_id": "w_test",
            "user_id": "usr_test",
            "chat_id": "c_test",
            "request_id": "turn_test",
            "message": "oi",
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert "event: run.started" in response.text
    assert "event: response.delta" in response.text
    assert '"delta":"olá"' in response.text
    assert "event: response.completed" in response.text


def test_stop_route_reports_active_run(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "stop_run", lambda request_id: request_id == "turn_live")

    response = client.post("/v1/turns/turn_live/stop")
    assert response.status_code == 200
    assert response.json()["accepted"] is True

    missing = client.post("/v1/turns/turn_missing/stop")
    assert missing.status_code == 404


def test_approval_route_is_limited_to_safe_choices(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "resolve_run_approval", lambda request_id, choice: 1)

    response = client.post(
        "/v1/turns/turn_live/approval",
        json={"choice": "once"},
    )
    assert response.status_code == 200
    assert response.json()["resolved"] == 1

    invalid = client.post(
        "/v1/turns/turn_live/approval",
        json={"choice": "always"},
    )
    assert invalid.status_code == 422
