from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import (
    create_session_token,
    hash_password,
    hash_token,
    normalize_email,
    verify_password,
)
from app.models import AuthSession, User, Workspace, WorkspaceMember
from app.services.bootstrap import get_or_create_default_workspace


SESSION_TTL_DAYS = 30


class AuthServiceError(ValueError):
    pass


class DuplicateEmailError(AuthServiceError):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def find_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(
        select(User).where(User.email == normalize_email(email))
    )


def count_users(db: Session) -> int:
    return db.scalar(select(func.count(User.id))) or 0


def ensure_workspace_membership(
    db: Session,
    *,
    user: User,
    workspace: Workspace | None = None,
    role: str = "member",
) -> WorkspaceMember:
    workspace = workspace or get_or_create_default_workspace(db)

    existing = db.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.workspace_id == workspace.id)
        .where(WorkspaceMember.user_id == user.id)
    )

    if existing is not None:
        return existing

    membership = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        role=role,
        status="active",
    )

    db.add(membership)
    db.flush()

    return membership


def register_user(
    db: Session,
    *,
    email: str,
    name: str,
    password: str,
) -> User:
    normalized_email = normalize_email(email)

    if find_user_by_email(db, normalized_email) is not None:
        raise DuplicateEmailError("email already registered")

    first_user = count_users(db) == 0

    user = User(
        email=normalized_email,
        name=name.strip(),
        password_hash=hash_password(password),
        status="active",
        is_superuser=first_user,
    )

    db.add(user)
    db.flush()

    ensure_workspace_membership(
        db,
        user=user,
        role="owner" if first_user else "member",
    )

    db.commit()
    db.refresh(user)

    return user


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
) -> User | None:
    user = find_user_by_email(db, email)

    if user is None:
        return None

    if user.status != "active":
        return None

    if not verify_password(password, user.password_hash):
        return None

    user.last_login_at = utc_now()
    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def create_auth_session(
    db: Session,
    *,
    user: User,
    ttl_days: int = SESSION_TTL_DAYS,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> tuple[str, AuthSession]:
    token = create_session_token()

    session = AuthSession(
        user_id=user.id,
        token_hash=hash_token(token),
        status="active",
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=utc_now() + timedelta(days=ttl_days),
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    return token, session


def get_auth_session_by_token(db: Session, token: str) -> AuthSession | None:
    session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    )

    if session is None:
        return None

    if session.status != "active":
        return None

    if session.revoked_at is not None:
        return None

    if session.expires_at <= utc_now():
        return None

    return session


def revoke_auth_session(db: Session, session: AuthSession) -> AuthSession:
    session.status = "revoked"
    session.revoked_at = utc_now()

    db.add(session)
    db.commit()
    db.refresh(session)

    return session
