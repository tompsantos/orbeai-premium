from __future__ import annotations

import json
import stat
from datetime import UTC, datetime
from pathlib import Path

from app.models import AuditLog, Chat, Message
from app.services.router_real_case_review import (
    RouterRealCaseReviewSession,
    RouterRealCaseReviewSource,
    review_sanitization_violations,
    secure_write_json,
    secure_write_jsonl,
    validate_phase5_review_session,
)
from app.services.router_real_case_review_web import create_review_app
from app.services.router_real_cases import (
    RouterRealCaseReview,
    build_real_case_candidate,
    review_template,
)
from fastapi.testclient import TestClient

EXPORT_SECRET = "pytest-router-review-session-secret-with-more-than-32-characters"


def _decision() -> dict:
    return {
        "router_version": "orbe-router-v1",
        "route_kind": "direct_model",
        "execution_strategy": "direct_provider",
        "provider_slug": "openai",
        "provider_name": "openai",
        "model_name": "openai-test-model",
        "primary_provider_slug": "openai",
        "primary_model_name": "openai-test-model",
        "reason": "decisão sanitizada de teste",
        "reason_codes": ["routing_policy", "provider_configured"],
        "fallback_chain": ["openai", "gemini", "mock"],
        "routing_mode": "automático",
        "estimated_latency_ms": None,
        "estimated_cost_usd": None,
        "quality_tier": "configured",
        "task_hints": [],
        "capability_ids": ["direct_text_response"],
        "primary_configured": True,
        "selected_configured": True,
        "is_fallback": False,
        "implemented": True,
        "classification": {
            "intent": "conversation",
            "domain": "general",
            "complexity": "low",
            "risk": "normal",
            "sensitivity": "normal",
            "task_hints": [],
            "requires_tools": False,
        },
        "execution_plan": {
            "strategy": "direct_provider",
            "route_kind": "direct_model",
            "primary_provider_slug": "openai",
            "provider_chain": ["openai", "gemini", "mock"],
            "model_by_provider": {},
            "capability_ids": ["direct_text_response"],
            "timeout_seconds": 15.0,
            "retry_attempts": 0,
            "allow_mock": True,
            "implemented": True,
        },
    }


def _source(raw_content: str) -> RouterRealCaseReviewSource:
    chat = Chat(
        id="c_review_session",
        workspace_id="w_review_session",
        title="privado",
        mode="strategist",
        model_preference="auto",
    )
    message = Message(
        id="m_review_session",
        chat_id=chat.id,
        role="user",
        content=raw_content,
        meta={"mode": "strategist", "model_preference": "auto"},
    )
    audit = AuditLog(
        id="aud_review_session",
        workspace_id=chat.workspace_id,
        action="router.decision",
        resource_type="message",
        resource_id=message.id,
        meta={"decision": _decision()},
        created_at=datetime(2026, 7, 19, 12, 0, tzinfo=UTC),
    )
    candidate = build_real_case_candidate(
        audit=audit,
        message=message,
        chat=chat,
        export_secret=EXPORT_SECRET,
    )
    return RouterRealCaseReviewSource(candidate=candidate, raw_content=raw_content)


def _session(tmp_path: Path, raw_content: str) -> RouterRealCaseReviewSession:
    source = _source(raw_content)
    reviews = [
        RouterRealCaseReview.model_validate(item)
        for item in review_template([source.candidate])
    ]
    return RouterRealCaseReviewSession(
        sources=[source],
        reviews=reviews,
        export_secret=EXPORT_SECRET,
        reviews_path=tmp_path / "reviews.jsonl",
        summary_path=tmp_path / "summary.json",
        session_url="http://127.0.0.1:8765/session/test-token",
    )


def test_review_app_exposes_raw_only_through_tokenized_source_endpoint(
    tmp_path: Path,
) -> None:
    raw_content = "conteúdo real confidencial que fica somente em memória"
    session = _session(tmp_path, raw_content)
    client = TestClient(create_review_app(session=session, token="test-token"))

    assert client.get("/session/wrong/api/source/unknown").status_code == 404

    candidates = client.get("/session/test-token/api/candidates")
    summary = client.get("/session/test-token/api/summary")
    source = client.get(
        f"/session/test-token/api/source/{next(iter(session.candidates))}"
    )

    assert candidates.status_code == 200
    assert summary.status_code == 200
    assert source.status_code == 200
    assert raw_content not in candidates.text
    assert raw_content not in summary.text
    assert source.json()["content"] == raw_content
    assert candidates.headers["cache-control"] == "no-store"
    assert candidates.headers["x-frame-options"] == "DENY"


def test_review_app_persists_only_sanitized_content(tmp_path: Path) -> None:
    raw_content = "avalie o contrato confidencial do cliente alpha"
    sanitized_content = "avalie os riscos gerais de um contrato comercial"
    session = _session(tmp_path, raw_content)
    candidate_id = next(iter(session.candidates))
    client = TestClient(create_review_app(session=session, token="test-token"))

    response = client.put(
        f"/session/test-token/api/review/{candidate_id}",
        json={
            "disposition": "accept",
            "reviewer_alias": "qa-router",
            "rationale": "paráfrase sem nomes ou dados do cliente",
            "sanitized_content": sanitized_content,
            "category": "document",
            "expected_override": None,
            "attestation": {
                "no_personal_names_or_identifiers": True,
                "no_internal_infrastructure": True,
                "not_verbatim": True,
                "expectation_reviewed": True,
            },
        },
    )

    assert response.status_code == 200
    review_payload = (tmp_path / "reviews.jsonl").read_text(encoding="utf-8")
    summary_payload = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert sanitized_content in review_payload
    assert raw_content not in review_payload
    assert raw_content not in json.dumps(summary_payload, ensure_ascii=False)
    assert summary_payload["accepted_count"] == 1
    assert summary_payload["category_counts"] == {"document": 1}
    assert summary_payload["phase5_coverage_ready"] is False


def test_review_app_rejects_sensitive_sanitized_content(tmp_path: Path) -> None:
    session = _session(tmp_path, "pedido real sem dado pessoal")
    candidate_id = next(iter(session.candidates))
    client = TestClient(create_review_app(session=session, token="test-token"))

    response = client.put(
        f"/session/test-token/api/review/{candidate_id}",
        json={
            "disposition": "accept",
            "reviewer_alias": "qa-router",
            "rationale": "teste negativo",
            "sanitized_content": "entre em contato com pessoa@example.com",
            "category": "conversation",
            "expected_override": None,
            "attestation": {
                "no_personal_names_or_identifiers": True,
                "no_internal_infrastructure": True,
                "not_verbatim": True,
                "expectation_reviewed": True,
            },
        },
    )

    assert response.status_code == 422
    assert "email" in response.json()["detail"]
    assert session.summary()["accepted_count"] == 0


def test_extended_review_scanner_blocks_operational_identifiers() -> None:
    samples = {
        "id 123e4567-e89b-42d3-a456-426614174000": "uuid_or_guid",
        "hash 0123456789abcdef01234567": "long_opaque_identifier",
        "host service.private.local": "internal_hostname",
        "host orbeone-private-node": "internal_hostname",
        "arquivo /opt/private/config.env": "internal_path",
        "banco postgresql://user:pass@db.local/app": "database_dsn",
    }

    for content, expected in samples.items():
        assert expected in review_sanitization_violations(content)


def test_review_app_requires_all_privacy_attestations(tmp_path: Path) -> None:
    session = _session(tmp_path, "pedido real sem dado pessoal")
    candidate_id = next(iter(session.candidates))
    client = TestClient(create_review_app(session=session, token="test-token"))

    response = client.put(
        f"/session/test-token/api/review/{candidate_id}",
        json={
            "disposition": "accept",
            "reviewer_alias": "qa-router",
            "rationale": "teste negativo",
            "sanitized_content": "pedido geral sem dado pessoal",
            "category": "conversation",
            "expected_override": None,
            "attestation": {
                "no_personal_names_or_identifiers": True,
                "no_internal_infrastructure": True,
                "not_verbatim": False,
                "expectation_reviewed": True,
            },
        },
    )

    assert response.status_code == 422
    assert "privacy attestations" in response.json()["detail"]
    assert session.summary()["accepted_count"] == 0


def test_phase5_validation_requires_twelve_attested_cases(tmp_path: Path) -> None:
    session = _session(tmp_path, "pedido real")
    reviews = list(session.reviews.values())

    try:
        validate_phase5_review_session(
            reviews=reviews,
            summary_path=tmp_path / "summary.json",
        )
    except ValueError as exc:
        assert "at least 12" in str(exc)
    else:
        raise AssertionError("phase 5 validation should reject insufficient coverage")


def test_phase5_validation_accepts_two_cases_per_critical_category(
    tmp_path: Path,
) -> None:
    categories = (
        "conversation",
        "software",
        "document",
        "research",
        "risk-sensitivity",
        "execution-boundary",
    )
    source = _source("conteúdo real base")
    reviews: list[RouterRealCaseReview] = []
    attestations: dict[str, dict[str, bool]] = {}
    for index, category in enumerate(category for category in categories for _ in range(2)):
        candidate_id = f"rcand_{index:024x}"
        reviews.append(
            RouterRealCaseReview(
                review_version="router-real-case-review-v1",
                candidate_id=candidate_id,
                disposition="accept",
                reviewer_alias="qa-router",
                rationale="paráfrase revisada",
                sanitized_content=f"caso sanitizado {category} número {index}",
                category=category,
                expected_override=source.candidate.expected_snapshot,
            )
        )
        attestations[candidate_id] = {
            "no_personal_names_or_identifiers": True,
            "no_internal_infrastructure": True,
            "not_verbatim": True,
            "expectation_reviewed": True,
        }

    summary_path = tmp_path / "phase5-summary.json"
    secure_write_json(
        summary_path,
        {
            "session_version": "router-real-case-review-session-v1",
            "attestations": attestations,
        },
    )

    payload = validate_phase5_review_session(
        reviews=reviews,
        summary_path=summary_path,
    )

    assert payload["session_version"] == "router-real-case-review-session-v1"


def test_finish_persists_status_and_requests_shutdown(tmp_path: Path) -> None:
    session = _session(tmp_path, "pedido real")
    shutdown = {"called": False}

    def request_shutdown() -> None:
        shutdown["called"] = True

    client = TestClient(
        create_review_app(
            session=session,
            token="test-token",
            shutdown_callback=request_shutdown,
        )
    )
    response = client.post("/session/test-token/api/finish", json={})

    assert response.status_code == 200
    assert response.json()["status"] == "finished"
    assert shutdown["called"] is True
    persisted = json.loads((tmp_path / "summary.json").read_text(encoding="utf-8"))
    assert persisted["status"] == "finished"


def test_secure_quarantine_writes_are_owner_only(tmp_path: Path) -> None:
    jsonl_path = tmp_path / "quarantine.jsonl"
    json_path = tmp_path / "summary.json"

    secure_write_jsonl(jsonl_path, [{"safe": True}])
    secure_write_json(json_path, {"safe": True})

    assert stat.S_IMODE(jsonl_path.stat().st_mode) == 0o600
    assert stat.S_IMODE(json_path.stat().st_mode) == 0o600
