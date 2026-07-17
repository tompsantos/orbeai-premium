from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def unique_email() -> str:
    return f"api-auth-{uuid4().hex}@orbeone.test"


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def register_payload(email: str | None = None) -> dict[str, str]:
    return {
        "email": email or unique_email(),
        "name": "Tom",
        "password": "senha-segura-123",
    }


def register_and_get_token() -> tuple[str, dict]:
    response = client.post("/v1/auth/register", json=register_payload())

    assert response.status_code == 201

    data = response.json()

    return data["access_token"], data


def test_auth_openapi_paths_are_registered() -> None:
    paths = app.openapi().get("paths", {})

    required = {
        "/v1/auth/register": {"post"},
        "/v1/auth/login": {"post"},
        "/v1/auth/me": {"get"},
        "/v1/auth/session": {"get"},
        "/v1/auth/logout": {"post"},
    }

    failures: list[str] = []

    for path, methods in required.items():
        registered = set(paths.get(path, {}).keys())
        missing = sorted(methods - registered)

        if missing:
            failures.append(f"{path}: missing {missing}; registered {sorted(registered)}")

    assert failures == []


def test_register_returns_token_and_user_without_password() -> None:
    response = client.post("/v1/auth/register", json=register_payload())

    assert response.status_code == 201

    data = response.json()

    assert data["access_token"]
    assert data["token_type"] == "bearer"
    assert data["expires_at"]
    assert data["user"]["email"].endswith("@orbeone.test")
    assert data["user"]["name"] == "Tom"
    assert "password" not in data
    assert "password_hash" not in data
    assert "password_hash" not in data["user"]


def test_register_rejects_duplicate_email() -> None:
    email = unique_email()

    first = client.post("/v1/auth/register", json=register_payload(email))

    assert first.status_code == 201

    second = client.post("/v1/auth/register", json=register_payload(email.upper()))

    assert second.status_code == 409


def test_login_accepts_valid_credentials_and_rejects_invalid() -> None:
    email = unique_email()

    register = client.post("/v1/auth/register", json=register_payload(email))

    assert register.status_code == 201

    invalid = client.post(
        "/v1/auth/login",
        json={"email": email, "password": "senha-errada"},
    )

    assert invalid.status_code == 401

    valid = client.post(
        "/v1/auth/login",
        json={"email": email.upper(), "password": "senha-segura-123"},
    )

    assert valid.status_code == 200
    assert valid.json()["access_token"]


def test_me_and_session_require_authentication() -> None:
    assert client.get("/v1/auth/me").status_code == 401
    assert client.get("/v1/auth/session").status_code == 401


def test_me_returns_current_user() -> None:
    token, register_data = register_and_get_token()

    response = client.get("/v1/auth/me", headers=auth_headers(token))

    assert response.status_code == 200
    assert response.json()["id"] == register_data["user"]["id"]


def test_session_returns_current_session() -> None:
    token, _ = register_and_get_token()

    response = client.get("/v1/auth/session", headers=auth_headers(token))

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "active"
    assert data["expires_at"]


def test_logout_revokes_session() -> None:
    token, _ = register_and_get_token()

    logout = client.post("/v1/auth/logout", headers=auth_headers(token))

    assert logout.status_code == 200
    assert logout.json()["ok"] is True

    after_logout = client.get("/v1/auth/me", headers=auth_headers(token))

    assert after_logout.status_code == 401
