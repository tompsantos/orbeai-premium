from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_audit_log_create_and_list() -> None:
    create_response = client.post(
        "/v1/audit-logs",
        json={
            "action": "test.audit",
            "resource_type": "test",
            "resource_id": "resource_123",
            "meta": {"status": "ok"},
        },
    )

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["action"] == "test.audit"
    assert created["resource_type"] == "test"
    assert created["resource_id"] == "resource_123"

    list_response = client.get("/v1/audit-logs?q=test.audit")

    assert list_response.status_code == 200

    logs = list_response.json()
    assert any(log["id"] == created["id"] for log in logs)


def test_chat_send_writes_audit_log() -> None:
    response = client.post(
        "/v1/chat/send",
        json={
            "content": "qual é a função de audit logs?",
            "mode": "dev",
            "model_preference": "mock",
        },
    )

    assert response.status_code == 201

    logs_response = client.get("/v1/audit-logs?action=chat.send")
    assert logs_response.status_code == 200

    logs = logs_response.json()
    assert len(logs) >= 1
    assert logs[0]["resource_type"] == "chat"
