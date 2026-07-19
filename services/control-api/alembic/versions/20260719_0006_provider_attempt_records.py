"""add provider attempt records

Revision ID: 20260719_0006
Revises: 20260718_0005
Create Date: 2026-07-19
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260719_0006"
down_revision: str | Sequence[str] | None = "20260718_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "provider_attempt_records",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column(
            "workspace_id",
            sa.String(length=40),
            sa.ForeignKey("workspaces.id"),
            nullable=False,
        ),
        sa.Column(
            "chat_id",
            sa.String(length=40),
            sa.ForeignKey("chats.id"),
            nullable=True,
        ),
        sa.Column(
            "message_id",
            sa.String(length=40),
            sa.ForeignKey("messages.id"),
            nullable=True,
        ),
        sa.Column(
            "model_run_id",
            sa.String(length=40),
            sa.ForeignKey("model_runs.id"),
            nullable=True,
        ),
        sa.Column("request_id", sa.String(length=120), nullable=True),
        sa.Column("provider_slug", sa.String(length=80), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failure_kind", sa.String(length=80), nullable=True),
        sa.Column("error_type", sa.String(length=120), nullable=True),
        sa.Column("state_reason", sa.String(length=120), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_provider_attempt_records_workspace_id",
        "provider_attempt_records",
        ["workspace_id"],
    )
    op.create_index(
        "ix_provider_attempt_records_chat_id",
        "provider_attempt_records",
        ["chat_id"],
    )
    op.create_index(
        "ix_provider_attempt_records_message_id",
        "provider_attempt_records",
        ["message_id"],
    )
    op.create_index(
        "ix_provider_attempt_records_model_run_id",
        "provider_attempt_records",
        ["model_run_id"],
    )
    op.create_index(
        "ix_provider_attempt_records_request_id",
        "provider_attempt_records",
        ["request_id"],
    )
    op.create_index(
        "ix_provider_attempt_records_provider_slug",
        "provider_attempt_records",
        ["provider_slug"],
    )
    op.create_index(
        "ix_provider_attempt_records_model_name",
        "provider_attempt_records",
        ["model_name"],
    )
    op.create_index(
        "ix_provider_attempt_records_status",
        "provider_attempt_records",
        ["status"],
    )
    op.create_index(
        "ix_provider_attempt_records_workspace_created_at",
        "provider_attempt_records",
        ["workspace_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_provider_attempt_records_workspace_created_at",
        table_name="provider_attempt_records",
    )
    op.drop_index("ix_provider_attempt_records_status", table_name="provider_attempt_records")
    op.drop_index("ix_provider_attempt_records_model_name", table_name="provider_attempt_records")
    op.drop_index(
        "ix_provider_attempt_records_provider_slug",
        table_name="provider_attempt_records",
    )
    op.drop_index("ix_provider_attempt_records_request_id", table_name="provider_attempt_records")
    op.drop_index(
        "ix_provider_attempt_records_model_run_id",
        table_name="provider_attempt_records",
    )
    op.drop_index("ix_provider_attempt_records_message_id", table_name="provider_attempt_records")
    op.drop_index("ix_provider_attempt_records_chat_id", table_name="provider_attempt_records")
    op.drop_index(
        "ix_provider_attempt_records_workspace_id",
        table_name="provider_attempt_records",
    )
    op.drop_table("provider_attempt_records")
