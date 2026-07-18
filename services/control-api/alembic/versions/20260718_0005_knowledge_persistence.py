"""add knowledge persistence

Revision ID: 20260718_0005
Revises: 20260627_0004
Create Date: 2026-07-18
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260718_0005"
down_revision: str | Sequence[str] | None = "20260627_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "research_reports",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column(
            "workspace_id",
            sa.String(length=40),
            sa.ForeignKey("workspaces.id"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.String(length=40),
            sa.ForeignKey("projects.id"),
            nullable=True,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=40),
            nullable=False,
            server_default="rascunho",
        ),
        sa.Column("plan", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("summary", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("risks", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        *timestamps(),
    )
    op.create_index(
        "ix_research_reports_workspace_id",
        "research_reports",
        ["workspace_id"],
    )
    op.create_index(
        "ix_research_reports_project_id",
        "research_reports",
        ["project_id"],
    )
    op.create_index(
        "ix_research_reports_status",
        "research_reports",
        ["status"],
    )

    op.create_table(
        "knowledge_materials",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column(
            "workspace_id",
            sa.String(length=40),
            sa.ForeignKey("workspaces.id"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.String(length=40),
            sa.ForeignKey("projects.id"),
            nullable=True,
        ),
        sa.Column(
            "report_id",
            sa.String(length=40),
            sa.ForeignKey("research_reports.id"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=220), nullable=False),
        sa.Column(
            "kind",
            sa.String(length=40),
            nullable=False,
            server_default="arquivo",
        ),
        sa.Column("url", sa.String(length=1000), nullable=True),
        sa.Column("excerpt", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column(
            "confidence",
            sa.Float(),
            nullable=False,
            server_default=sa.text("1.0"),
        ),
        sa.Column("source_type", sa.String(length=80), nullable=True),
        sa.Column("source_product", sa.String(length=80), nullable=True),
        sa.Column("source_entity_id", sa.String(length=120), nullable=True),
        sa.Column("metadata", sa.JSON(), nullable=True),
        *timestamps(),
    )
    op.create_index(
        "ix_knowledge_materials_workspace_id",
        "knowledge_materials",
        ["workspace_id"],
    )
    op.create_index(
        "ix_knowledge_materials_project_id",
        "knowledge_materials",
        ["project_id"],
    )
    op.create_index(
        "ix_knowledge_materials_report_id",
        "knowledge_materials",
        ["report_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_knowledge_materials_report_id",
        table_name="knowledge_materials",
    )
    op.drop_index(
        "ix_knowledge_materials_project_id",
        table_name="knowledge_materials",
    )
    op.drop_index(
        "ix_knowledge_materials_workspace_id",
        table_name="knowledge_materials",
    )
    op.drop_table("knowledge_materials")

    op.drop_index("ix_research_reports_status", table_name="research_reports")
    op.drop_index("ix_research_reports_project_id", table_name="research_reports")
    op.drop_index("ix_research_reports_workspace_id", table_name="research_reports")
    op.drop_table("research_reports")
