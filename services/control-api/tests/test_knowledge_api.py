from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_research_reports_and_materials_are_persistent() -> None:
    report_response = client.post(
        "/v1/knowledge/reports",
        json={"question": "Como conectar conhecimento e biblioteca?"},
    )
    assert report_response.status_code == 201
    report = report_response.json()

    assert report["status"] == "rascunho"
    assert report["summary"] == ""
    assert report["sources"] == []
    assert len(report["plan"]) == 4

    material_response = client.post(
        "/v1/knowledge/materials",
        json={
            "report_id": report["id"],
            "title": "Arquitetura da orbeAI",
            "kind": "arquivo",
            "excerpt": "Referência persistida sem conteúdo binário.",
            "confidence": 1,
            "source_type": "file-metadata",
            "source_product": "orbeAI",
            "source_entity_id": "architecture.pdf",
            "meta": {
                "filename": "architecture.pdf",
                "size_bytes": 2048,
                "content_persisted": False,
            },
        },
    )
    assert material_response.status_code == 201
    material = material_response.json()

    assert material["report_id"] == report["id"]
    assert material["source_type"] == "file-metadata"
    assert material["meta"]["content_persisted"] is False

    refreshed_report_response = client.get(
        f"/v1/knowledge/reports/{report['id']}"
    )
    assert refreshed_report_response.status_code == 200
    refreshed_report = refreshed_report_response.json()
    assert refreshed_report["sources"][0]["id"] == material["id"]

    update_response = client.patch(
        f"/v1/knowledge/reports/{report['id']}",
        json={
            "status": "concluído",
            "summary": "Persistência validada com rastreabilidade.",
            "risks": ["O conteúdo do arquivo ainda não foi enviado."],
        },
    )
    assert update_response.status_code == 200
    updated_report = update_response.json()
    assert updated_report["status"] == "concluído"
    assert "rastreabilidade" in updated_report["summary"]

    list_response = client.get("/v1/knowledge/reports?q=biblioteca")
    assert list_response.status_code == 200
    assert any(item["id"] == report["id"] for item in list_response.json())

    delete_report_response = client.delete(
        f"/v1/knowledge/reports/{report['id']}"
    )
    assert delete_report_response.status_code == 204

    preserved_material_response = client.get(
        f"/v1/knowledge/materials/{material['id']}"
    )
    assert preserved_material_response.status_code == 200
    assert preserved_material_response.json()["report_id"] is None

    delete_material_response = client.delete(
        f"/v1/knowledge/materials/{material['id']}"
    )
    assert delete_material_response.status_code == 204
