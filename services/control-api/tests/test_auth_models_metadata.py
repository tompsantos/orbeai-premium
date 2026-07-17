from app.db.base import Base
from app.models import AuthSession, User, WorkspaceMember


def test_auth_models_are_registered_in_metadata() -> None:
    assert User.__tablename__ in Base.metadata.tables
    assert WorkspaceMember.__tablename__ in Base.metadata.tables
    assert AuthSession.__tablename__ in Base.metadata.tables


def test_users_table_has_required_columns() -> None:
    columns = Base.metadata.tables["users"].columns

    required = {
        "id",
        "email",
        "name",
        "password_hash",
        "status",
        "is_superuser",
        "last_login_at",
        "created_at",
        "updated_at",
    }

    assert required.issubset(set(columns.keys()))


def test_workspace_members_table_has_required_columns() -> None:
    columns = Base.metadata.tables["workspace_members"].columns

    required = {
        "id",
        "workspace_id",
        "user_id",
        "role",
        "status",
        "created_at",
        "updated_at",
    }

    assert required.issubset(set(columns.keys()))


def test_auth_sessions_table_has_required_columns() -> None:
    columns = Base.metadata.tables["auth_sessions"].columns

    required = {
        "id",
        "user_id",
        "token_hash",
        "status",
        "user_agent",
        "ip_address",
        "expires_at",
        "revoked_at",
        "created_at",
        "updated_at",
    }

    assert required.issubset(set(columns.keys()))
