"""add feature flags

Revision ID: 20260627_0002
Revises: 20260627_0001
Create Date: 2026-06-27
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260627_0002"
down_revision: str | Sequence[str] | None = "20260627_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    ]


def upgrade() -> None:
    op.create_table(
        "feature_flags",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("workspace_id", sa.String(length=40), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("label", sa.String(length=180), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("audience", sa.String(length=40), nullable=False, server_default="interno"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        *timestamps(),
        sa.UniqueConstraint("workspace_id", "key", name="uq_feature_flags_workspace_key"),
    )
    op.create_index("ix_feature_flags_workspace_id", "feature_flags", ["workspace_id"])
    op.create_index("ix_feature_flags_key", "feature_flags", ["key"])


def downgrade() -> None:
    op.drop_index("ix_feature_flags_key", table_name="feature_flags")
    op.drop_index("ix_feature_flags_workspace_id", table_name="feature_flags")
    op.drop_table("feature_flags")
