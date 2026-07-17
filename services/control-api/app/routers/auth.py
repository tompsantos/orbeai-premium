from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import AuthContext, get_current_auth_context
from app.schemas.auth import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthSessionRead,
    AuthTokenRead,
    AuthUserRead,
)
from app.services.auth import (
    DuplicateEmailError,
    authenticate_user,
    create_auth_session,
    register_user,
    revoke_auth_session,
)


router = APIRouter(prefix="/auth", tags=["auth"])


def request_ip(request: Request) -> str | None:
    if request.client is None:
        return None

    return request.client.host


@router.post("/register", response_model=AuthTokenRead, status_code=status.HTTP_201_CREATED)
def register(
    payload: AuthRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenRead:
    try:
        user = register_user(
            db,
            email=payload.email,
            name=payload.name,
            password=payload.password,
        )
    except DuplicateEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from exc

    token, session = create_auth_session(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request_ip(request),
    )

    return AuthTokenRead(
        access_token=token,
        expires_at=session.expires_at,
        user=user,
    )


@router.post("/login", response_model=AuthTokenRead)
def login(
    payload: AuthLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> AuthTokenRead:
    user = authenticate_user(
        db,
        email=payload.email,
        password=payload.password,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token, session = create_auth_session(
        db,
        user=user,
        user_agent=request.headers.get("user-agent"),
        ip_address=request_ip(request),
    )

    return AuthTokenRead(
        access_token=token,
        expires_at=session.expires_at,
        user=user,
    )


@router.get("/me", response_model=AuthUserRead)
def me(context: AuthContext = Depends(get_current_auth_context)) -> AuthUserRead:
    return context.user


@router.get("/session", response_model=AuthSessionRead)
def session(context: AuthContext = Depends(get_current_auth_context)) -> AuthSessionRead:
    return context.session


@router.post("/logout")
def logout(
    context: AuthContext = Depends(get_current_auth_context),
    db: Session = Depends(get_db),
) -> dict[str, bool | str]:
    revoke_auth_session(db, context.session)

    return {
        "ok": True,
        "status": "logged_out",
    }
