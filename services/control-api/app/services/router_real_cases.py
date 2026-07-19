from __future__ import annotations

import hashlib
import hmac
import json
import re
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuditLog, Chat, Message
from app.services.router_evaluation import (
    ROUTER_CASE_SCHEMA_VERSION,
    RouterCaseEnvironment,
    RouterCaseExpected,
    RouterCaseRequest,
    RouterEvaluationCase,
)

REAL_CASE_CANDIDATE_VERSION = "router-real-case-candidate-v1"
REAL_CASE_REVIEW_VERSION = "router-real-case-review-v1"

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

_EMAIL_PATTERN = re.compile(r"\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b", re.I)
_BRAZIL_DOCUMENT_PATTERN = re.compile(
    r"\b(?:\d{3}[.\s-]?\d{3}[.\s-]?\d{3}[-\s]?\d{2}|"
    r"\d{2}[.\s-]?\d{3}[.\s-]?\d{3}[/\s-]?\d{4}[-\s]?\d{2})\b"
)
_PHONE_PATTERN = re.compile(r"(?<!\d)(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}(?!\d)")
_IP_PATTERN = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_URL_PATTERN = re.compile(r"https?://\S+", re.I)
_SECRET_PATTERN = re.compile(
    r"(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk|ghp|github_pat|xox[baprs])-[-A-Za-z0-9_]{12,}|"
    r"\b(?:api[_-]?key|access[_-]?token|bearer)\s*[:=]\s*\S+)",
    re.I,
)


class CandidateContentMetrics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    character_count: int = Field(ge=0)
    word_count: int = Field(ge=0)
    line_count: int = Field(ge=0)


class CandidateObservedDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    route_kind: str
    execution_strategy: str
    provider_slug: str
    primary_provider_slug: str
    reason_codes: list[str]
    capability_ids: list[str]
    provider_chain: list[str]
    is_fallback: bool
    classification: dict[str, Any]


class RouterRealCaseCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_version: Literal["router-real-case-candidate-v1"]
    candidate_id: str = Field(pattern=r"^rcand_[a-f0-9]{24}$")
    source_day: str
    source_action: str
    content_fingerprint: str = Field(pattern=r"^hmac-sha256:[a-f0-9]{64}$")
    content_metrics: CandidateContentMetrics
    request: RouterCaseRequest
    environment: RouterCaseEnvironment
    observed: CandidateObservedDecision
    expected_snapshot: RouterCaseExpected
    review_status: Literal["pending"] = "pending"
    raw_content_included: Literal[False] = False


class RouterRealCaseReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review_version: Literal["router-real-case-review-v1"]
    candidate_id: str = Field(pattern=r"^rcand_[a-f0-9]{24}$")
    disposition: Literal["accept", "reject"]
    reviewer_alias: str = Field(min_length=1, max_length=80)
    rationale: str = Field(min_length=1, max_length=500)
    sanitized_content: str | None = Field(default=None, max_length=5_000)
    category: str | None = Field(default=None, min_length=1, max_length=80)
    expected_override: RouterCaseExpected | None = None

    @model_validator(mode="after")
    def validate_acceptance_fields(self) -> RouterRealCaseReview:
        if self.disposition == "accept":
            if not self.sanitized_content or not self.sanitized_content.strip():
                raise ValueError("accepted review requires sanitized_content")
            if not self.category or not self.category.strip():
                raise ValueError("accepted review requires category")
        return self


def _require_export_secret(secret: str) -> bytes:
    clean = secret.strip()
    if len(clean) < 32:
        raise ValueError("export secret must contain at least 32 characters")
    return clean.encode("utf-8")


def _fingerprint(secret: bytes, value: str) -> str:
    return hmac.new(secret, value.encode("utf-8"), hashlib.sha256).hexdigest()


def _candidate_id(secret: bytes, workspace_id: str, message_id: str) -> str:
    digest = _fingerprint(secret, f"candidate:{workspace_id}:{message_id}")
    return f"rcand_{digest[:24]}"


def _content_fingerprint(secret: bytes, content: str) -> str:
    return f"hmac-sha256:{_fingerprint(secret, f'content:{content}') }"


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


def _context_count(decision: dict[str, Any], capability_id: str) -> int:
    capabilities = {str(item) for item in decision.get("capability_ids") or []}
    return 1 if capability_id in capabilities else 0


def _request_from_message(message: Message, decision: dict[str, Any]) -> RouterCaseRequest:
    meta = dict(message.meta or {})
    reason_codes = {str(item) for item in decision.get("reason_codes") or []}
    return RouterCaseRequest(
        content="[conteúdo removido: revisão humana obrigatória]",
        mode=str(meta.get("resolved_mode") or meta.get("mode") or "strategist"),
        model_preference=str(
            meta.get("resolved_model_preference") or meta.get("model_preference") or "auto"
        ),
        routing_mode=str(decision.get("routing_mode") or "automático"),
        memory_context_count=_context_count(decision, "external_memory_context"),
        knowledge_context_count=_context_count(decision, "external_knowledge_context"),
        cognition_enabled="cognition_unavailable" not in reason_codes,
    )


def _environment_from_decision(decision: dict[str, Any]) -> RouterCaseEnvironment:
    provider_states: dict[str, str] = {}
    selected = str(decision.get("provider_slug") or "")
    primary = str(decision.get("primary_provider_slug") or "")
    is_fallback = bool(decision.get("is_fallback"))
    chain = {str(item) for item in decision.get("fallback_chain") or []}

    if is_fallback and primary in {"openai", "gemini", "nvidia"} and primary != selected:
        provider_states[primary] = "unavailable"
    if selected == "mock" and is_fallback:
        for slug in ("openai", "gemini", "nvidia"):
            if slug not in chain:
                provider_states[slug] = "unavailable"

    return RouterCaseEnvironment.model_validate({"provider_states": provider_states})


def _observed_decision(decision: dict[str, Any]) -> CandidateObservedDecision:
    execution_plan = dict(decision.get("execution_plan") or {})
    classification = dict(decision.get("classification") or {})
    return CandidateObservedDecision(
        route_kind=str(decision.get("route_kind") or "unknown"),
        execution_strategy=str(decision.get("execution_strategy") or "unknown"),
        provider_slug=str(decision.get("provider_slug") or "unknown"),
        primary_provider_slug=str(decision.get("primary_provider_slug") or "unknown"),
        reason_codes=[str(item) for item in decision.get("reason_codes") or []],
        capability_ids=[str(item) for item in decision.get("capability_ids") or []],
        provider_chain=[str(item) for item in execution_plan.get("provider_chain") or []],
        is_fallback=bool(decision.get("is_fallback")),
        classification=classification,
    )


def _expected_snapshot(observed: CandidateObservedDecision) -> RouterCaseExpected:
    return RouterCaseExpected(
        allowed_route_kinds=[observed.route_kind],
        prohibited_route_kinds=[],
        allowed_execution_strategies=[observed.execution_strategy],
        allowed_provider_slugs=[observed.provider_slug],
        allowed_primary_provider_slugs=[observed.primary_provider_slug],
        required_reason_codes=observed.reason_codes,
        prohibited_reason_codes=[],
        required_capabilities=observed.capability_ids,
        required_provider_chain_members=[],
        prohibited_provider_chain_members=[],
        expected_is_fallback=observed.is_fallback,
        classification={
            key: value
            for key, value in observed.classification.items()
            if key in {"intent", "domain", "complexity", "risk", "sensitivity", "requires_tools"}
            and isinstance(value, (str, bool))
        },
    )


def build_real_case_candidate(
    *,
    audit: AuditLog,
    message: Message,
    chat: Chat,
    export_secret: str,
) -> RouterRealCaseCandidate:
    if audit.workspace_id is None or audit.workspace_id != chat.workspace_id:
        raise ValueError("audit and chat must belong to the same workspace")
    if message.chat_id != chat.id or message.role != "user":
        raise ValueError("candidate source must be a user message from the audited chat")
    decision = _decision_payload(audit)
    if decision is None:
        raise ValueError("audit log does not contain a router decision")

    secret = _require_export_secret(export_secret)
    observed = _observed_decision(decision)
    content = message.content
    return RouterRealCaseCandidate(
        candidate_version=REAL_CASE_CANDIDATE_VERSION,
        candidate_id=_candidate_id(secret, chat.workspace_id, message.id),
        source_day=audit.created_at.date().isoformat(),
        source_action=audit.action,
        content_fingerprint=_content_fingerprint(secret, content),
        content_metrics=CandidateContentMetrics(
            character_count=len(content),
            word_count=len(content.split()),
            line_count=max(1, len(content.splitlines())),
        ),
        request=_request_from_message(message, decision),
        environment=_environment_from_decision(decision),
        observed=observed,
        expected_snapshot=_expected_snapshot(observed),
    )


def extract_real_case_candidates(
    db: Session,
    *,
    workspace_id: str,
    export_secret: str,
    limit: int = 300,
) -> list[RouterRealCaseCandidate]:
    audits = list(
        db.scalars(
            select(AuditLog)
            .where(AuditLog.workspace_id == workspace_id)
            .where(AuditLog.action.in_(_SOURCE_ACTIONS))
            .order_by(AuditLog.created_at.desc())
            .limit(max(1, min(limit * 4, 1_200)))
        )
    )
    candidates: list[RouterRealCaseCandidate] = []
    seen_message_ids: set[str] = set()

    for audit in audits:
        if len(candidates) >= limit:
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
        candidates.append(candidate)
        seen_message_ids.add(message_id)

    return candidates


def sanitization_violations(content: str) -> list[str]:
    checks = {
        "email": _EMAIL_PATTERN,
        "brazil_document": _BRAZIL_DOCUMENT_PATTERN,
        "phone": _PHONE_PATTERN,
        "ip_address": _IP_PATTERN,
        "url": _URL_PATTERN,
        "secret_or_token": _SECRET_PATTERN,
    }
    return [name for name, pattern in checks.items() if pattern.search(content)]


def promote_reviewed_cases(
    *,
    candidates: Iterable[RouterRealCaseCandidate],
    reviews: Iterable[RouterRealCaseReview],
    export_secret: str,
) -> list[RouterEvaluationCase]:
    secret = _require_export_secret(export_secret)
    candidate_map = {candidate.candidate_id: candidate for candidate in candidates}
    promoted: list[RouterEvaluationCase] = []
    seen_reviews: set[str] = set()

    for review in reviews:
        if review.candidate_id in seen_reviews:
            raise ValueError(f"duplicate review for candidate: {review.candidate_id}")
        seen_reviews.add(review.candidate_id)
        candidate = candidate_map.get(review.candidate_id)
        if candidate is None:
            raise ValueError(f"review references unknown candidate: {review.candidate_id}")
        if review.disposition == "reject":
            continue

        sanitized = (review.sanitized_content or "").strip()
        violations = sanitization_violations(sanitized)
        if violations:
            raise ValueError(
                f"sanitized content still contains blocked patterns for {review.candidate_id}: "
                f"{', '.join(violations)}"
            )
        if _content_fingerprint(secret, sanitized) == candidate.content_fingerprint:
            raise ValueError(f"sanitized content matches raw content for {review.candidate_id}")

        request = candidate.request.model_copy(update={"content": sanitized})
        promoted.append(
            RouterEvaluationCase(
                schema_version=ROUTER_CASE_SCHEMA_VERSION,
                case_id=f"real-{review.candidate_id.removeprefix('rcand_')}",
                category=str(review.category),
                request=request,
                environment=candidate.environment,
                expected=review.expected_override or candidate.expected_snapshot,
            )
        )

    return promoted


def load_jsonl(path: Path, model_type: type[BaseModel]) -> list[BaseModel]:
    result: list[BaseModel] = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"invalid JSON at line {line_number}: {exc.msg}") from exc
        result.append(model_type.model_validate(payload))
    return result


def write_jsonl(path: Path, rows: Iterable[BaseModel | dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as output:
        for row in rows:
            payload = row.model_dump(mode="json") if isinstance(row, BaseModel) else row
            output.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")


def review_template(candidates: Iterable[RouterRealCaseCandidate]) -> list[dict[str, Any]]:
    return [
        {
            "review_version": REAL_CASE_REVIEW_VERSION,
            "candidate_id": candidate.candidate_id,
            "disposition": "reject",
            "reviewer_alias": "preencher",
            "rationale": "preencher antes de aceitar",
            "sanitized_content": None,
            "category": None,
            "expected_override": None,
        }
        for candidate in candidates
    ]
