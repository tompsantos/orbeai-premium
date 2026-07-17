from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_feature_flags_list_and_toggle() -> None:
    list_response = client.get("/v1/feature-flags")

    assert list_response.status_code == 200

    flags = list_response.json()
    assert len(flags) >= 1

    flag = flags[0]

    toggle_response = client.post(f"/v1/feature-flags/{flag['key']}/toggle")

    assert toggle_response.status_code == 200

    toggled = toggle_response.json()

    assert toggled["key"] == flag["key"]
    assert toggled["enabled"] != flag["enabled"]

    audit_response = client.get("/v1/audit-logs?q=feature_flag.toggle")

    assert audit_response.status_code == 200
    assert any(log["resource_id"] == flag["key"] for log in audit_response.json())
