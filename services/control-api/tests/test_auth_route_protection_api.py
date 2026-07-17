from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def unique_email() -> str:
    return f"route-protection-{uuid4().hex}@orbeone.test"


def register_token() -> str:
    response = client.post(
        "/v1/auth/register",
        json={
            "email": unique_email(),
            "name": "Tom",
            "password": "senha-segura-123",
        },
    )

    assert response.status_code == 201

    return response.json()["access_token"]


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_public_routes_remain_public() -> None:
    assert client.get("/health").status_code == 200
    assert client.get("/v1/status").status_code == 200

    register = client.post(
        "/v1/auth/register",
        json={
            "email": unique_email(),
            "name": "Tom",
            "password": "senha-segura-123",
        },
    )

    assert register.status_code == 201


def test_core_routes_reject_missing_token() -> None:
    checks = [
        ("get", "/v1/projects", None),
        ("get", "/v1/chats", None),
        ("post", "/v1/chat/send", {"content": "teste sem token"}),
        ("get", "/v1/artifacts", None),
        ("get", "/v1/memories", None),
        ("get", "/v1/audit-logs", None),
        ("get", "/v1/feature-flags", None),
        ("get", "/v1/workspace", None),
        ("get", "/v1/model-runs", None),
        ("get", "/v1/model-providers", None),
        ("post", "/v1/router/resolve", {"mode": "strategist", "model_preference": "auto"}),
    ]

    for method, path, payload in checks:
        response = getattr(client, method)(path, json=payload) if payload is not None else getattr(client, method)(path)

        assert response.status_code == 401, f"{method.upper()} {path} returned {response.status_code}"


def test_core_routes_accept_valid_token() -> None:
    token = register_token()

    assert client.get("/v1/workspace", headers=auth_headers(token)).status_code == 200
    assert client.get("/v1/projects", headers=auth_headers(token)).status_code == 200
    assert client.get("/v1/model-providers", headers=auth_headers(token)).status_code == 200
