from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import datetime, timedelta

from sqlalchemy import delete, update
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import ProviderAttemptRecord
from app.models.core import utc_now


def _optional_text(value: object, max_length: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text[:max_length] if text else None


def persist_provider_attempt_records(
    db: Session,
    *,
    workspace_id: str,
    chat_id: str | None,
    request_id: str | None,
    attempts: Iterable[Mapping[str, object]],
    message_id: str | None = None,
    model_run_id: str | None = None,
) -> list[ProviderAttemptRecord]:
    records: list[ProviderAttemptRecord] = []

    for payload in attempts:
        provider_slug = _optional_text(payload.get("provider_slug"), 80)
        model_name = _optional_text(payload.get("model_name"), 120)
        if provider_slug is None or model_name is None:
            continue

        record = ProviderAttemptRecord(
            workspace_id=workspace_id,
            chat_id=chat_id,
            message_id=message_id,
            model_run_id=model_run_id,
            request_id=_optional_text(request_id, 120),
            provider_slug=provider_slug,
            model_name=model_name,
            attempt=max(0, int(payload.get("attempt") or 0)),
            status=_optional_text(payload.get("status"), 40) or "unknown",
            latency_ms=max(0, int(payload.get("latency_ms") or 0)),
            failure_kind=_optional_text(payload.get("failure_kind"), 80),
            error_type=_optional_text(payload.get("error_type"), 120),
            state_reason=_optional_text(payload.get("state_reason"), 120),
        )
        db.add(record)
        records.append(record)

    return records


def persist_gateway_attempt_records(
    *,
    workspace_id: str,
    correlation_id: str,
    attempts: Iterable[Mapping[str, object]],
    chat_id: str | None = None,
    message_id: str | None = None,
) -> list[ProviderAttemptRecord]:
    with SessionLocal() as db:
        records = persist_provider_attempt_records(
            db,
            workspace_id=workspace_id,
            chat_id=chat_id,
            request_id=correlation_id,
            message_id=message_id,
            attempts=attempts,
        )
        db.commit()
        for record in records:
            db.refresh(record)
        return records


def associate_gateway_attempt_records(
    db: Session,
    *,
    workspace_id: str,
    correlation_id: str | None,
    chat_id: str,
    message_id: str,
    model_run_id: str,
) -> int:
    if not correlation_id:
        return 0

    result = db.execute(
        update(ProviderAttemptRecord)
        .where(ProviderAttemptRecord.workspace_id == workspace_id)
        .where(ProviderAttemptRecord.request_id == correlation_id)
        .values(
            chat_id=chat_id,
            message_id=message_id,
            model_run_id=model_run_id,
        )
    )
    return int(result.rowcount or 0)


def purge_expired_provider_attempt_records(
    db: Session,
    *,
    workspace_id: str,
    retention_days: int,
    now: datetime | None = None,
) -> int:
    cutoff = (now or utc_now()) - timedelta(days=max(1, int(retention_days)))
    result = db.execute(
        delete(ProviderAttemptRecord)
        .where(ProviderAttemptRecord.workspace_id == workspace_id)
        .where(ProviderAttemptRecord.created_at < cutoff)
    )
    return int(result.rowcount or 0)
