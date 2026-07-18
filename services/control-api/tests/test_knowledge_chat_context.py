from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_chat_selects_relevant_knowledge_and_records_trace() -> None:
    report_response = client.post(
        "/v1/knowledge/reports",
        json={
            "question": "Como funciona o protocolo jabuticaba vetorial?",
            "status": "concluído",
            "summary": (
                "O protocolo jabuticaba vetorial organiza índices por contexto, "
                "preserva a origem e limita o material enviado ao modelo."
            ),
            "risks": ["Não confundir referência de arquivo com conteúdo extraído."],
        },
    )
    assert report_response.status_code == 201
    report = report_response.json()

    material_response = client.post(
        "/v1/knowledge/materials",
        json={
            "report_id": report["id"],
            "title": "Notas do protocolo jabuticaba vetorial",
            "kind": "arquivo",
            "excerpt": "Referência cadastrada para o protocolo jabuticaba vetorial.",
            "confidence": 0.95,
            "meta": {
                "content_stored": False,
                "storage_state": "metadata-only",
            },
        },
    )
    assert material_response.status_code == 201
    material = material_response.json()

    before_response = client.get(
        "/v1/audit-logs?action=knowledge.context.select&limit=300"
    )
    assert before_response.status_code == 200
    before_count = len(before_response.json())

    send_response = client.post(
        "/v1/chat/send",
        json={
            "content": "Explique o protocolo jabuticaba vetorial e seus cuidados.",
            "mode": "research",
            "model_preference": "auto",
        },
    )
    assert send_response.status_code == 201
    chat_id = send_response.json()["chat_id"]

    audit_response = client.get(
        "/v1/audit-logs?action=knowledge.context.select&limit=300"
    )
    assert audit_response.status_code == 200
    logs = audit_response.json()
    assert len(logs) == before_count + 1

    trace = next(log for log in logs if log["resource_id"] == chat_id)
    source_by_id = {
        source["source_id"]: source for source in trace["meta"]["sources"]
    }

    assert report["id"] in source_by_id
    assert material["id"] in source_by_id
    assert source_by_id[material["id"]]["metadata_only"] is True
    assert trace["meta"]["source_count"] == 2

    disable_response = client.patch(
        "/v1/feature-flags/knowledge_context",
        json={"enabled": False},
    )
    assert disable_response.status_code == 200

    second_send = client.post(
        "/v1/chat/send",
        json={
            "content": "Retome o protocolo jabuticaba vetorial.",
            "mode": "research",
            "model_preference": "auto",
        },
    )
    assert second_send.status_code == 201

    after_disabled = client.get(
        "/v1/audit-logs?action=knowledge.context.select&limit=300"
    )
    assert after_disabled.status_code == 200
    assert len(after_disabled.json()) == len(logs)
