import json
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.routers.chat_live as chat_live_module
from app.main import app

client = TestClient(app)


def _events(body: str) -> list[dict]:
    events: list[dict] = []
    for block in body.split("\n\n"):
        data_line = next((line for line in block.splitlines() if line.startswith("data: ")), None)
        if data_line:
            events.append(json.loads(data_line[6:]))
    return events


def test_live_chat_streams_and_persists_router_execution(monkeypatch) -> None:
    monkeypatch.setattr(
        chat_live_module,
        "get_settings",
        lambda: SimpleNamespace(
            cognition_enabled=False,
            cognition_fallback_to_legacy=True,
        ),
    )

    with client.stream(
        "POST",
        "/v1/chat/live",
        json={
            "content": "organize os próximos passos da orbeAI",
            "mode": "strategist",
            "model_preference": "mock",
        },
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 201
    assert response.headers["content-type"].startswith("text/event-stream")

    events = _events(body)
    event_types = [event["type"] for event in events]
    assert event_types[0] == "run.started"
    assert "router.decision" in event_types
    assert "execution.started" in event_types
    assert "response.delta" in event_types
    assert event_types[-1] == "response.completed"

    router_event = next(event for event in events if event["type"] == "router.decision")
    assert router_event["decision"]["router_version"] == "orbe-router-v1"
    assert router_event["decision"]["execution_strategy"] == "direct_provider"

    completed = events[-1]["response"]
    assert completed["provider"] == "orbe-mock"
    assert completed["assistant_message"]["content"]

    user_meta = completed["user_message"]["meta"]
    assistant_meta = completed["assistant_message"]["meta"]
    assert user_meta["router_decision"]["router_version"] == "orbe-router-v1"
    assert assistant_meta["router_decision"]["execution_strategy"] == "direct_provider"
    assert assistant_meta["provider_attempts"][-1]["status"] == "success"
    assert assistant_meta["latency_ms"] >= 0

    messages = client.get(f"/v1/chats/{completed['chat_id']}/messages")
    assert messages.status_code == 200
    message_ids = {message["id"] for message in messages.json()}
    assert completed["user_message"]["id"] in message_ids
    assert completed["assistant_message"]["id"] in message_ids

    model_run = client.get(f"/v1/model-runs/{completed['model_run_id']}")
    assert model_run.status_code == 200
    assert model_run.json()["task_type"] == "chat.live.direct_provider"

    router_logs = client.get("/v1/audit-logs?action=router.decision&limit=300").json()
    persisted = next(
        log for log in router_logs if log["request_id"] == router_event["request_id"]
    )
    assert persisted["meta"]["decision"]["router_version"] == "orbe-router-v1"


def test_live_registry_rejects_foreign_owner() -> None:
    from app.services.live_run_registry import (
        LiveRunOwner,
        get_owned_live_run,
        register_live_run,
        unregister_live_run,
    )

    owner = LiveRunOwner(
        request_id="live_owner_test",
        workspace_id="w_a",
        user_id="usr_a",
        chat_id="c_a",
    )
    register_live_run(owner)
    try:
        assert get_owned_live_run("live_owner_test", "w_a", "usr_a") is owner
        assert get_owned_live_run("live_owner_test", "w_a", "usr_b") is None
        assert get_owned_live_run("live_owner_test", "w_b", "usr_a") is None
    finally:
        unregister_live_run("live_owner_test")
