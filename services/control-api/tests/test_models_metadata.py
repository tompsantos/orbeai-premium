from app.db.base import Base
import app.models  # noqa: F401


def test_initial_tables_are_registered() -> None:
    expected = {
        "workspaces",
        "projects",
        "chats",
        "messages",
        "artifacts",
        "artifact_versions",
        "memories",
        "model_providers",
        "model_runs",
        "audit_logs",
        "integration_clients",
    }

    assert expected.issubset(set(Base.metadata.tables.keys()))
