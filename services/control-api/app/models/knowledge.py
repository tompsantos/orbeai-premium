from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.core import make_id, utc_now


class ResearchReport(Base):
    __tablename__ = "research_reports"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: make_id("res")
    )
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id"), index=True, nullable=False
    )
    project_id: Mapped[str | None] = mapped_column(
        ForeignKey("projects.id"), index=True, nullable=True
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(40), default="rascunho", index=True, nullable=False
    )
    plan: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="", nullable=False)
    risks: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    sources: Mapped[list["KnowledgeMaterial"]] = relationship(
        back_populates="report"
    )


class KnowledgeMaterial(Base):
    __tablename__ = "knowledge_materials"

    id: Mapped[str] = mapped_column(
        String(40), primary_key=True, default=lambda: make_id("km")
    )
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id"), index=True, nullable=False
    )
    project_id: Mapped[str | None] = mapped_column(
        ForeignKey("projects.id"), index=True, nullable=True
    )
    report_id: Mapped[str | None] = mapped_column(
        ForeignKey("research_reports.id"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    kind: Mapped[str] = mapped_column(String(40), default="arquivo", nullable=False)
    url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    excerpt: Mapped[str] = mapped_column(Text, default="", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    source_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_product: Mapped[str | None] = mapped_column(String(80), nullable=True)
    source_entity_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    meta: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    report: Mapped[ResearchReport | None] = relationship(back_populates="sources")
