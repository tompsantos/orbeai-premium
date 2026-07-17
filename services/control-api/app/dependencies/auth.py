from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import AuthSession, User
from app.services.auth import get_auth_session_by_token


@dataclass(frozen=True)
class AuthContext:
    user: User
    session: AuthSession


def extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer":
        return None

    token = token.strip()

    return token or None


def auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_auth_context(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> AuthContext:
    token = extract_bearer_token(authorization)

    if token is None:
        raise auth_error()

    session = get_auth_session_by_token(db, token)

    if session is None:
        raise auth_error()

    user = db.get(User, session.user_id)

    if user is None or user.status != "active":
        raise auth_error()

    return AuthContext(user=user, session=session)
