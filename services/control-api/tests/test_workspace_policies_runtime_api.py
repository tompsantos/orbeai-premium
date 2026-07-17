from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def update_workspace_settings(payload: dict) -> None:
    response = client.patch("/v1/workspace/settings", json=payload)
    assert response.status_code == 200


def test_memory_policy_strict_blocks_inferred_memory_but_allows_explicit_memory() -> None:
    update_workspace_settings({"memory_policy": "strict"})

    inferred_marker = uuid4().hex

    inferred_response = client.post(
        "/v1/chat/send",
        json={
            "content": f"eu prefiro respostas objetivas sempre {inferred_marker}",
            "mode": "strategist",
            "model_preference": "mock",
        },
    )

    assert inferred_response.status_code == 201
    assert inferred_response.json()["memory_events"] == []

    inferred_memories_response = client.get(f"/v1/memories?q={inferred_marker}")
    assert inferred_memories_response.status_code == 200
    assert inferred_memories_response.json() == []

    explicit_marker = uuid4().hex

    explicit_response = client.post(
        "/v1/chat/send",
        json={
            "content": f"lembre que teste de política strict explícita {explicit_marker}",
            "mode": "strategist",
            "model_preference": "mock",
        },
    )

    assert explicit_response.status_code == 201

    explicit_data = explicit_response.json()

    assert explicit_data["memory_events"]
    assert explicit_data["memory_events"][0]["status"] == "ativa"

    update_workspace_settings({"memory_policy": "balanced"})


def test_artifact_export_respects_workspace_allow_exports_policy() -> None:
    marker = uuid4().hex

    create_response = client.post(
        "/v1/artifacts",
        json={
            "title": f"Export policy test {marker}",
            "kind": "documento",
            "content": f"conteúdo exportável {marker}",
        },
    )

    assert create_response.status_code == 201

    artifact = create_response.json()
    artifact_id = artifact["id"]

    update_workspace_settings({"allow_exports": False})

    blocked_response = client.get(f"/v1/artifacts/{artifact_id}/export")

    assert blocked_response.status_code == 403

    update_workspace_settings({"allow_exports": True})

    export_response = client.get(f"/v1/artifacts/{artifact_id}/export")

    assert export_response.status_code == 200

    exported = export_response.json()

    assert exported["artifact_id"] == artifact_id
    assert exported["version_number"] == 1
    assert marker in exported["content"]

    delete_response = client.delete(f"/v1/artifacts/{artifact_id}")
    assert delete_response.status_code == 204
