"""initial orbeAI schema

Revision ID: 20260627_0001
Revises:
Create Date: 2026-06-27
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260627_0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    ]


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("plan", sa.String(length=40), nullable=False, server_default="internal"),
        *timestamps(),
        sa.UniqueConstraint("slug", name="uq_workspaces_slug"),
    )
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"])

    op.create_table(
        "projects",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("product", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_projects_workspace_id", "projects", ["workspace_id"])
    op.create_index("ix_projects_slug", "projects", ["slug"])

    op.create_table(
        "chats",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.String(length=40), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("title", sa.String(length=220), nullable=False, server_default="Nova conversa"),
        sa.Column("mode", sa.String(length=60), nullable=False, server_default="strategist"),
        sa.Column("model_preference", sa.String(length=80), nullable=False, server_default="auto"),
        *timestamps(),
    )
    op.create_index("ix_chats_workspace_id", "chats", ["workspace_id"])
    op.create_index("ix_chats_project_id", "chats", ["project_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("chat_id", sa.String(length=40), sa.ForeignKey("chats.id"), nullable=False),
        sa.Column("role", sa.String(length=40), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=80), nullable=True),
        sa.Column("model", sa.String(length=120), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_messages_chat_id", "messages", ["chat_id"])

    op.create_table(
        "artifacts",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.String(length=40), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column("kind", sa.String(length=80), nullable=False, server_default="document"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
        sa.Column("source_type", sa.String(length=80), nullable=True),
        sa.Column("source_product", sa.String(length=80), nullable=True),
        sa.Column("source_entity_id", sa.String(length=120), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_artifacts_workspace_id", "artifacts", ["workspace_id"])
    op.create_index("ix_artifacts_project_id", "artifacts", ["project_id"])

    op.create_table(
        "artifact_versions",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("artifact_id", sa.String(length=40), sa.ForeignKey("artifacts.id"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_artifact_versions_artifact_id", "artifact_versions", ["artifact_id"])

    op.create_table(
        "memories",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.String(length=40), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("product", sa.String(length=80), nullable=True),
        sa.Column("label", sa.String(length=180), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("scope", sa.String(length=40), nullable=False, server_default="workspace"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
        sa.Column("sensitivity", sa.String(length=40), nullable=False, server_default="normal"),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("source_type", sa.String(length=80), nullable=True),
        sa.Column("source_product", sa.String(length=80), nullable=True),
        sa.Column("source_entity_id", sa.String(length=120), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_memories_workspace_id", "memories", ["workspace_id"])
    op.create_index("ix_memories_project_id", "memories", ["project_id"])
    op.create_index("ix_memories_product", "memories", ["product"])

    op.create_table(
        "model_providers",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="inactive"),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("name", name="uq_model_providers_name"),
    )
    op.create_index("ix_model_providers_name", "model_providers", ["name"])

    op.create_table(
        "model_runs",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("chat_id", sa.String(length=40), sa.ForeignKey("chats.id"), nullable=True),
        sa.Column("message_id", sa.String(length=40), sa.ForeignKey("messages.id"), nullable=True),
        sa.Column("provider_name", sa.String(length=80), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("task_type", sa.String(length=80), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="success"),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("estimated_cost_usd", sa.Float(), nullable=True),
        sa.Column("router_reason", sa.Text(), nullable=True),
        sa.Column("fallback_chain", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_model_runs_workspace_id", "model_runs", ["workspace_id"])
    op.create_index("ix_model_runs_chat_id", "model_runs", ["chat_id"])
    op.create_index("ix_model_runs_message_id", "model_runs", ["message_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("product", sa.String(length=80), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("resource_type", sa.String(length=80), nullable=True),
        sa.Column("resource_id", sa.String(length=120), nullable=True),
        sa.Column("request_id", sa.String(length=120), nullable=True),
        sa.Column("ip_address", sa.String(length=80), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_audit_logs_workspace_id", "audit_logs", ["workspace_id"])
    op.create_index("ix_audit_logs_product", "audit_logs", ["product"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_request_id", "audit_logs", ["request_id"])

    op.create_table(
        "integration_clients",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("product", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="active"),
        sa.Column("allowed_scopes", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_index("ix_integration_clients_workspace_id", "integration_clients", ["workspace_id"])
    op.create_index("ix_integration_clients_product", "integration_clients", ["product"])


def downgrade() -> None:
    op.drop_index("ix_integration_clients_product", table_name="integration_clients")
    op.drop_index("ix_integration_clients_workspace_id", table_name="integration_clients")
    op.drop_table("integration_clients")

    op.drop_index("ix_audit_logs_request_id", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_product", table_name="audit_logs")
    op.drop_index("ix_audit_logs_workspace_id", table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index("ix_model_runs_message_id", table_name="model_runs")
    op.drop_index("ix_model_runs_chat_id", table_name="model_runs")
    op.drop_index("ix_model_runs_workspace_id", table_name="model_runs")
    op.drop_table("model_runs")

    op.drop_index("ix_model_providers_name", table_name="model_providers")
    op.drop_table("model_providers")

    op.drop_index("ix_memories_product", table_name="memories")
    op.drop_index("ix_memories_project_id", table_name="memories")
    op.drop_index("ix_memories_workspace_id", table_name="memories")
    op.drop_table("memories")

    op.drop_index("ix_artifact_versions_artifact_id", table_name="artifact_versions")
    op.drop_table("artifact_versions")

    op.drop_index("ix_artifacts_project_id", table_name="artifacts")
    op.drop_index("ix_artifacts_workspace_id", table_name="artifacts")
    op.drop_table("artifacts")

    op.drop_index("ix_messages_chat_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index("ix_chats_project_id", table_name="chats")
    op.drop_index("ix_chats_workspace_id", table_name="chats")
    op.drop_table("chats")

    op.drop_index("ix_projects_slug", table_name="projects")
    op.drop_index("ix_projects_workspace_id", table_name="projects")
    op.drop_table("projects")

    op.drop_index("ix_workspaces_slug", table_name="workspaces")
    op.drop_table("workspaces")
