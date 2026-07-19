from __future__ import annotations

import json
import os
import re
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Chat, Message
from app.services.router_real_cases import (
    RouterRealCaseCandidate,
    build_real_case_candidate,
    sanitization_violations,
)

_SOURCE_ACTIONS = (
    "router.decision",
    "chat.send",
    "chat.send.failed",
    "chat.live",
    "chat.live.failed",
)
_DIRECT_MESSAGE_ACTIONS = {
    "router.decision",
    "chat.send.failed",
    "chat.live.failed",
    "chat.live.stopped",
}

_REVIEW_BLOCK_PATTERNS = {
    "uuid_or_guid": re.compile(
        r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
        re.I,
    ),
    "long_opaque_identifier": re.compile(r"\b[a-f0-9]{24,64}\b", re.I),
    "internal_hostname": re.compile(
        r"\b(?:[a-z0-9-]+\.)+(?:local|internal|lan)\b|"
        r"\b(?:orbeone|orbeai)-[a-z0-9-]+\b",
        re.I,
    ),
    "internal_path": re.compile(
        r"(?:^|\s)(?:/opt/|/home/|/etc/|[a-z]:\\users\\)\S+",
        re.I,
    ),
    "database_dsn": re.compile(
        r"\b(?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/\S+",
        re.I,
    ),
}


@dataclass(frozen=True, slots=True)
class RouterRealCaseReviewSource:
    candidate: RouterRealCaseCandidate
    raw_content: str = field(repr=False)


def _decision_payload(audit: AuditLog) -> dict[str, Any] | None:
    meta = dict(audit.meta or {})
    raw = meta.get("decision") if audit.action == "router.decision" else meta.get("router_decision")
    return dict(raw) if isinstance(raw, dict) else None


def _message_id_from_audit(db: Session, audit: AuditLog) -> str | None:
    meta = dict(audit.meta or {})
    if audit.action == "router.decision":
        return audit.resource_id
    if audit.action in _DIRECT_MESSAGE_ACTIONS:
        raw_message_id = meta.get("message_id")
        return str(raw_message_id) if raw_message_id else None

    raw_assistant_id = meta.get("message_id")
    if not raw_assistant_id:
        return None
    assistant = db.get(Message, str(raw_assistant_id))
    if assistant is None:
        return None
    return db.scalar(
        select(Message.id)
        .where(Message.chat_id == assistant.chat_id)
        .where(Message.role == "user")
        .where(Message.created_at <= assistant.created_at)
        .order_by(Message.created_at.desc())
        .limit(1)
    )


def extract_real_case_review_sources(
    db: Session,
    *,
    workspace_id: str,
    export_secret: str,
    limit: int = 300,
) -> list[RouterRealCaseReviewSource]:
    audits = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .where(AuditLog.action.in_(_SOURCE_ACTIONS))
            .order_by(AuditLog.created_at.desc())
            .limit(max(1, min(limit * 4, 1_200)))
        )
    )
    sources: list[RouterRealCaseReviewSource] = []
    seen_message_ids: set[str] = set()

    for audit in audits:
        if len(sources) >= limit:
            break
        if _decision_payload(audit) is None:
            continue
        message_id = _message_id_from_audit(db, audit)
        if not message_id or message_id in seen_message_ids:
            continue
        message = db.get(Message, message_id)
        if message is None or message.role != "user":
            continue
        chat = db.get(Chat, message.chat_id)
        if chat is None or chat.workspace_id != workspace_id:
            continue
        candidate = build_real_case_candidate(
            audit=audit,
            message=message,
            chat=chat,
            export_secret=export_secret,
        )
        sources.append(
            RouterRealCaseReviewSource(
                candidate=candidate,
                raw_content=message.content,
            )
        )
        seen_message_ids.add(message_id)

    return sources


def review_sanitization_violations(content: str) -> list[str]:
    violations = list(sanitization_violations(content))
    violations.extend(
        name for name, pattern in _REVIEW_BLOCK_PATTERNS.items() if pattern.search(content)
    )
    return sorted(set(violations))


def secure_write_jsonl(
    path: Path,
    rows: list[BaseModel | dict[str, Any]],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        dir=path.parent,
        text=True,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            for row in rows:
                payload = row.model_dump(mode="json") if isinstance(row, BaseModel) else row
                output.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
        os.replace(temporary_path, path)
        path.chmod(0o600)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def secure_write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        dir=path.parent,
        text=True,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            json.dump(payload, output, ensure_ascii=False, indent=2)
            output.write("\n")
        os.replace(temporary_path, path)
        path.chmod(0o600)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise
