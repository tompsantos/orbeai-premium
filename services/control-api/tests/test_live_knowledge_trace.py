import json
from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

import app.routers.chat_live as chat_live_module
from app.main import app
from app.services.providers.real import ProviderExecutionResult

client = TestClient(app)


def _events(body: str) -> list[dict]:
    events: list[dict] = []
    for block in body.split("\n\n"):
        data_line = next(
            (line for line in block.splitlines() if line.startswith("data: ")),
            None,
        )
        if data_line:
            events.append(json.loads(data_line[6:]))
    return events


def test_live_fallback_uses_and_persists_selected_knowledge(monkeypatch) -> None:
    token = f"pitanga{uuid4().hex}"

    report_response = client.post(
        "/v1/knowledge/reports",
        json={
            "question": f"Como funciona o protocolo {token}?",
            "status": "concluído",
            "summary": (
                f"O protocolo {token} preserva a origem, limita o contexto "
                "e registra as fontes usadas no turno vivo."
            ),
        },
    )
    assert report_response.status_code == 201
    report = report_response.json()

    material_response = client.post(
        "/v1/knowledge/materials",
        json={
            "report_id": report["id"],
            "title": f"Referência {token}",
            "kind": "arquivo",
            "excerpt": f"Referência cadastrada para o protocolo {token}.",
            "confidence": 0.9,
            "meta": {"content_stored": False},
        },
    )
    assert material_response.status_code == 201
    material = material_response.json()

    captured: dict[str, str | None] = {}

    def fake_execute_provider(
        *,
        provider_slug: str,
        content: str,
        mode: str,
        model_preference: str,
        memory_context: str | None = None,
        knowledge_context: str | None = None,
    ) -> ProviderExecutionResult:
        captured["provider_slug"] = provider_slug
        captured["knowledge_context"] = knowledge_context
        return ProviderExecutionResult(
            content="fallback validado com conhecimento persistido",
            provider_name="orbe-test",
            model_name="orbe-test-model",
            input_tokens=12,
            output_tokens=7,
            latency_ms=1,
            estimated_cost_usd=0.0,
        )

    monkeypatch.setattr(
        chat_live_module,
        "get_settings",
        lambda: SimpleNamespace(
            cognition_enabled=False,
            cognition_fallback_to_legacy=True,
        ),
    )
    monkeypatch.setattr(chat_live_module, "execute_provider", fake_execute_provider)

    with client.stream(
        "POST",
        "/v1/chat/live",
        json={
            "content": f"Explique o protocolo {token}.",
            "mode": "research",
            "model_preference": "auto",
        },
    ) as response:
        body = "".join(response.iter_text())

    assert response.status_code == 201
    events = _events(body)
    knowledge_events = [event for event in events if event["type"] == "knowledge.context"]
    assert len(knowledge_events) == 1

    source_ids = {source["source_id"] for source in knowledge_events[0]["sources"]}
    assert source_ids == {report["id"], material["id"]}
    material_source = next(
        source
        for source in knowledge_events[0]["sources"]
        if source["source_id"] == material["id"]
    )
    assert material_source["metadata_only"] is True

    selected_context = captured["knowledge_context"]
    assert selected_context is not None
    assert report["id"] in selected_context
    assert material["id"] in selected_context

    completed = events[-1]["response"]
    assistant_meta = completed["assistant_message"]["meta"]
    assert assistant_meta["knowledge_context_count"] == 2
    assert {source["source_id"] for source in assistant_meta["knowledge_sources"]} == source_ids
    assert assistant_meta["feature_knowledge_context_enabled"] is True

    selection_logs = client.get(
        "/v1/audit-logs?action=knowledge.context.select&limit=300"
    ).json()
    matching_selections = [
        log for log in selection_logs if log["resource_id"] == completed["chat_id"]
    ]
    assert len(matching_selections) == 1

    live_logs = client.get("/v1/audit-logs?action=chat.live&limit=300").json()
    live_trace = next(
        log for log in live_logs if log["resource_id"] == completed["chat_id"]
    )
    assert live_trace["meta"]["knowledge_context_count"] == 2
    assert {
        source["source_id"] for source in live_trace["meta"]["knowledge_sources"]
    } == source_ids
