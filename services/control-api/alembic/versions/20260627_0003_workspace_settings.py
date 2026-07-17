"""add workspace settings

Revision ID: 20260627_0003
Revises: 20260627_0002
Create Date: 2026-06-27
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260627_0003"
down_revision: str | Sequence[str] | None = "20260627_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    ]


def upgrade() -> None:
    op.create_table(
        "workspace_settings",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("locale", sa.String(length=20), nullable=False, server_default="pt-BR"),
        sa.Column("timezone", sa.String(length=80), nullable=False, server_default="America/Sao_Paulo"),
        sa.Column("default_chat_mode", sa.String(length=60), nullable=False, server_default="strategist"),
        sa.Column("default_model_preference", sa.String(length=80), nullable=False, server_default="auto"),
        sa.Column("memory_policy", sa.String(length=40), nullable=False, server_default="balanced"),
        sa.Column("data_retention_days", sa.Integer(), nullable=False, server_default="365"),
        sa.Column("allow_exports", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("allow_public_sharing", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("metadata", sa.JSON(), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("workspace_id", name="uq_workspace_settings_workspace_id"),
    )
    op.create_index("ix_workspace_settings_workspace_id", "workspace_settings", ["workspace_id"])


def downgrade() -> None:
    op.drop_index("ix_workspace_settings_workspace_id", table_name="workspace_settings")
    op.drop_table("workspace_settings")
