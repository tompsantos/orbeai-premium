from pathlib import Path


MIGRATION = Path("alembic/versions/20260627_0004_auth_foundation.py")


def test_auth_foundation_migration_exists() -> None:
    assert MIGRATION.exists()


def test_auth_foundation_migration_revision_chain() -> None:
    text = MIGRATION.read_text()

    assert 'revision: str = "20260627_0004"' in text
    assert 'down_revision: str | Sequence[str] | None = "20260627_0003"' in text


def test_auth_foundation_migration_creates_auth_tables() -> None:
    text = MIGRATION.read_text()

    assert 'op.create_table(\n        "users"' in text
    assert 'op.create_table(\n        "workspace_members"' in text
    assert 'op.create_table(\n        "auth_sessions"' in text


def test_auth_foundation_migration_has_core_constraints() -> None:
    text = MIGRATION.read_text()

    assert 'sa.UniqueConstraint("email", name="uq_users_email")' in text
    assert 'sa.UniqueConstraint("workspace_id", "user_id", name="uq_workspace_members_workspace_user")' in text
    assert 'sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash")' in text
    assert 'sa.ForeignKey("workspaces.id")' in text
    assert 'sa.ForeignKey("users.id")' in text
