from uuid import uuid4

import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.models import WorkspaceMember
from app.services.auth import (
    DuplicateEmailError,
    authenticate_user,
    create_auth_session,
    get_auth_session_by_token,
    register_user,
    revoke_auth_session,
)


def unique_email() -> str:
    return f"auth-{uuid4().hex}@orbeone.test"


def test_register_user_creates_user_and_membership() -> None:
    db = SessionLocal()

    try:
        user = register_user(
            db,
            email=unique_email(),
            name="Tom",
            password="senha-segura-123",
        )

        assert user.id.startswith("usr_")
        assert user.email.endswith("@orbeone.test")
        assert user.password_hash.startswith("pbkdf2_sha256$")
        assert "senha-segura-123" not in user.password_hash

        membership = db.scalar(
            select(WorkspaceMember).where(WorkspaceMember.user_id == user.id)
        )

        assert membership is not None
        assert membership.status == "active"
        assert membership.role in {"owner", "member"}
    finally:
        db.close()


def test_register_user_rejects_duplicate_email() -> None:
    db = SessionLocal()
    email = unique_email()

    try:
        register_user(
            db,
            email=email,
            name="Tom",
            password="senha-segura-123",
        )

        with pytest.raises(DuplicateEmailError):
            register_user(
                db,
                email=email.upper(),
                name="Outro Tom",
                password="senha-segura-456",
            )
    finally:
        db.close()


def test_authenticate_user_accepts_valid_credentials_and_rejects_invalid() -> None:
    db = SessionLocal()
    email = unique_email()

    try:
        register_user(
            db,
            email=email,
            name="Tom",
            password="senha-segura-123",
        )

        assert authenticate_user(db, email=email, password="errada") is None

        user = authenticate_user(
            db,
            email=email.upper(),
            password="senha-segura-123",
        )

        assert user is not None
        assert user.last_login_at is not None
    finally:
        db.close()


def test_auth_session_lifecycle() -> None:
    db = SessionLocal()
    email = unique_email()

    try:
        user = register_user(
            db,
            email=email,
            name="Tom",
            password="senha-segura-123",
        )

        token, session = create_auth_session(
            db,
            user=user,
            user_agent="pytest",
            ip_address="127.0.0.1",
        )

        assert token
        assert session.id.startswith("sess_")
        assert session.token_hash != token
        assert session.status == "active"

        found = get_auth_session_by_token(db, token)

        assert found is not None
        assert found.id == session.id

        revoke_auth_session(db, found)

        assert get_auth_session_by_token(db, token) is None
    finally:
        db.close()
