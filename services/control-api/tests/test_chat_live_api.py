import json
from types import SimpleNamespace

import app.routers.chat_live as chat_live_module
from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def _events(body: str) -> list[dict]:
    events: list[dict] = []
    for block in body.split("\n\n"):
        data_line = next((line for line in block.splitlines() if line.startswith("data: ")), None)
        if data_line:
            events.append(json.loads(data_line[6:]))
    return events


def test_live_chat_streams_and_persists_fallback_response(monkeypatch) -> None:
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
    assert "fallback.started" in event_types
    assert "response.delta" in event_types
    assert event_types[-1] == "response.completed"

    completed = events[-1]["response"]
    assert completed["provider"] == "orbe-mock"
    assert completed["assistant_message"]["content"]

    messages = client.get(f"/v1/chats/{completed['chat_id']}/messages")
    assert messages.status_code == 200
    message_ids = {message["id"] for message in messages.json()}
    assert completed["user_message"]["id"] in message_ids
    assert completed["assistant_message"]["id"] in message_ids


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
