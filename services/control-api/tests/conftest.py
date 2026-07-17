from collections.abc import Generator
from datetime import timedelta


import pytest
from sqlalchemy import select

from app.db.session import SessionLocal
from app.dependencies.auth import AuthContext, get_current_auth_context
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.main import app
from app.models import AuthSession, FeatureFlag, User, WorkspaceMember
from app.services.bootstrap import get_or_create_default_workspace
from app.services.feature_flags import ensure_default_flags
from app.services.workspace_settings import get_or_create_workspace_settings


DEFAULT_FLAG_STATE = {
    "real_providers": True,
    "auto_memory": True,
    "memory_context": True,
    "audit_logs": True,
    "artifact_versions": True,
}

DEFAULT_WORKSPACE_SETTINGS = {
    "locale": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "default_chat_mode": "strategist",
    "default_model_preference": "auto",
    "memory_policy": "balanced",
    "data_retention_days": 365,
    "allow_exports": True,
    "allow_public_sharing": False,
    "meta": {
        "seeded": True,
        "product": "orbeAI",
        "test_reset": True,
    },
}


def reset_runtime_state() -> None:
    db = SessionLocal()

    try:
        workspace = get_or_create_default_workspace(db)
        settings = get_or_create_workspace_settings(db, workspace)

        for field, value in DEFAULT_WORKSPACE_SETTINGS.items():
            setattr(settings, field, value)

        ensure_default_flags(db, workspace.id)

        flags = db.scalars(
            select(FeatureFlag).where(FeatureFlag.workspace_id == workspace.id)
        ).all()

        for flag in flags:
            if flag.key in DEFAULT_FLAG_STATE:
                flag.enabled = DEFAULT_FLAG_STATE[flag.key]

        db.add(settings)
        db.commit()
    finally:
        db.close()

AUTH_REAL_TEST_FILES = {
    "test_auth_api.py",
    "test_auth_route_protection_api.py",
    "test_current_workspace_context_api.py",
}


def should_use_real_auth(node: object) -> bool:
    path = getattr(node, "path", "")

    return str(path).split("/")[-1] in AUTH_REAL_TEST_FILES


def fake_auth_context() -> AuthContext:
    now = utc_now = __import__("app.models.core", fromlist=["utc_now"]).utc_now()

    user = User(
        id="usr_pytest_auth",
        email="pytest@orbeone.test",
        name="Pytest Auth",
        password_hash="pytest-only",
        status="active",
        is_superuser=True,
        created_at=now,
        updated_at=now,
    )

    session = AuthSession(
        id="sess_pytest_auth",
        user_id=user.id,
        token_hash="pytest-only",
        status="active",
        user_agent="pytest",
        ip_address="127.0.0.1",
        expires_at=now + timedelta(days=1),
        created_at=now,
        updated_at=now,
    )

    return AuthContext(user=user, session=session)


def fake_workspace_context() -> CurrentWorkspaceContext:
    db = SessionLocal()

    try:
        workspace = get_or_create_default_workspace(db)
        auth = fake_auth_context()
        now = __import__("app.models.core", fromlist=["utc_now"]).utc_now()

        membership = WorkspaceMember(
            id="wm_pytest_auth",
            workspace_id=workspace.id,
            user_id=auth.user.id,
            role="owner",
            status="active",
            created_at=now,
            updated_at=now,
        )

        return CurrentWorkspaceContext(
            auth=auth,
            workspace=workspace,
            membership=membership,
        )
    finally:
        db.close()


@pytest.fixture(autouse=True)
def auth_dependency_override(request: pytest.FixtureRequest) -> Generator[None, None, None]:
    if should_use_real_auth(request.node):
        app.dependency_overrides.pop(get_current_workspace_context, None)
        app.dependency_overrides.pop(get_current_auth_context, None)
        yield
        app.dependency_overrides.pop(get_current_workspace_context, None)
        app.dependency_overrides.pop(get_current_auth_context, None)
        return

    app.dependency_overrides[get_current_auth_context] = fake_auth_context
    app.dependency_overrides[get_current_workspace_context] = fake_workspace_context

    yield

    app.dependency_overrides.pop(get_current_workspace_context, None)
    app.dependency_overrides.pop(get_current_auth_context, None)


@pytest.fixture(autouse=True)
def clean_runtime_controls() -> Generator[None, None, None]:
    reset_runtime_state()

    yield

    reset_runtime_state()
