from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.core import make_id, utc_now


class ProviderAttemptRecord(Base):
    __tablename__ = "provider_attempt_records"

    id: Mapped[str] = mapped_column(
        String(40),
        primary_key=True,
        default=lambda: make_id("pat"),
    )
    workspace_id: Mapped[str] = mapped_column(
        ForeignKey("workspaces.id"),
        index=True,
        nullable=False,
    )
    chat_id: Mapped[str | None] = mapped_column(
        ForeignKey("chats.id"),
        index=True,
        nullable=True,
    )
    message_id: Mapped[str | None] = mapped_column(
        ForeignKey("messages.id"),
        index=True,
        nullable=True,
    )
    model_run_id: Mapped[str | None] = mapped_column(
        ForeignKey("model_runs.id"),
        index=True,
        nullable=True,
    )
    request_id: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    provider_slug: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_kind: Mapped[str | None] = mapped_column(String(80), nullable=True)
    error_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    state_reason: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
