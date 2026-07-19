from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import delete

from app.db.session import SessionLocal
from app.models import AuditLog, Chat, Message, Workspace
from app.services.router_real_cases import (
    REAL_CASE_CANDIDATE_VERSION,
    REAL_CASE_REVIEW_VERSION,
    RouterRealCaseReview,
    build_real_case_candidate,
    extract_real_case_candidates,
    promote_reviewed_cases,
    review_template,
    sanitization_violations,
)

EXPORT_SECRET = "pytest-router-real-case-secret-with-more-than-32-characters"


def _decision(
    *,
    provider: str = "openai",
    primary: str = "openai",
    is_fallback: bool = False,
) -> dict:
    chain = [provider, "mock"] if is_fallback else [provider, "gemini", "mock"]
    return {
        "router_version": "orbe-router-v1",
        "route_kind": "direct_model",
        "execution_strategy": "direct_provider",
        "provider_slug": provider,
        "provider_name": provider,
        "model_name": f"{provider}-test-model",
        "primary_provider_slug": primary,
        "primary_model_name": f"{primary}-test-model",
        "reason": "decisão sanitizada de teste",
        "reason_codes": [
            "routing_policy",
            "provider_fallback" if is_fallback else "provider_configured",
        ],
        "fallback_chain": chain,
        "routing_mode": "automático",
        "estimated_latency_ms": None,
        "estimated_cost_usd": None,
        "quality_tier": "configured",
        "task_hints": [],
        "capability_ids": ["direct_text_response"],
        "primary_configured": not is_fallback,
        "selected_configured": True,
        "is_fallback": is_fallback,
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
            "primary_provider_slug": primary,
            "provider_chain": chain,
            "model_by_provider": {},
            "capability_ids": ["direct_text_response"],
            "timeout_seconds": 15.0,
            "retry_attempts": 0,
            "allow_mock": True,
            "implemented": True,
        },
    }


def _source_objects(content: str = "conteúdo real que não pode sair") -> tuple[AuditLog, Message, Chat]:
    workspace_id = "w_private_real_case"
    chat = Chat(
        id="c_private_real_case",
        workspace_id=workspace_id,
        title="privado",
        mode="strategist",
        model_preference="auto",
    )
    message = Message(
        id="m_private_real_case",
        chat_id=chat.id,
        role="user",
        content=content,
        meta={"mode": "strategist", "model_preference": "auto"},
    )
    audit = AuditLog(
        id="aud_private_real_case",
        workspace_id=workspace_id,
        action="router.decision",
        resource_type="message",
        resource_id=message.id,
        meta={"decision": _decision()},
        created_at=datetime(2026, 7, 19, 12, 0, tzinfo=UTC),
    )
    return audit, message, chat


def _candidate(content: str = "conteúdo real que não pode sair"):
    audit, message, chat = _source_objects(content)
    return build_real_case_candidate(
        audit=audit,
        message=message,
        chat=chat,
        export_secret=EXPORT_SECRET,
    )


def test_candidate_contains_no_raw_content_or_raw_identifiers() -> None:
    audit, message, chat = _source_objects()
    candidate = build_real_case_candidate(
        audit=audit,
        message=message,
        chat=chat,
        export_secret=EXPORT_SECRET,
    )
    serialized = json.dumps(candidate.model_dump(mode="json"), ensure_ascii=False)

    assert candidate.candidate_version == REAL_CASE_CANDIDATE_VERSION
    assert candidate.raw_content_included is False
    assert candidate.request.content == "[conteúdo removido: revisão humana obrigatória]"
    assert message.content not in serialized
    assert message.id not in serialized
    assert chat.id not in serialized
    assert chat.workspace_id not in serialized
    assert candidate.content_metrics.character_count == len(message.content)
    assert candidate.content_fingerprint.startswith("hmac-sha256:")


def test_candidate_identity_is_stable_per_secret_and_changes_with_secret() -> None:
    first = _candidate()
    repeated = _candidate()
    audit, message, chat = _source_objects()
    other_secret = build_real_case_candidate(
        audit=audit,
        message=message,
        chat=chat,
        export_secret="another-router-real-case-secret-with-more-than-32-characters",
    )

    assert first.candidate_id == repeated.candidate_id
    assert first.content_fingerprint == repeated.content_fingerprint
    assert first.candidate_id != other_secret.candidate_id
    assert first.content_fingerprint != other_secret.content_fingerprint


def test_extractor_isolates_workspace_and_deduplicates_message() -> None:
    suffix = uuid4().hex[:10]
    ids: dict[str, str] = {}

    with SessionLocal() as db:
        target = Workspace(name="Target Real Cases", slug=f"target-real-cases-{suffix}")
        other = Workspace(name="Other Real Cases", slug=f"other-real-cases-{suffix}")
        db.add_all([target, other])
        db.flush()
        target_chat = Chat(workspace_id=target.id, title="target")
        other_chat = Chat(workspace_id=other.id, title="other")
        db.add_all([target_chat, other_chat])
        db.flush()
        target_message = Message(
            chat_id=target_chat.id,
            role="user",
            content="pedido real do workspace alvo aqui",
            meta={"mode": "strategist", "model_preference": "auto"},
        )
        other_message = Message(
            chat_id=other_chat.id,
            role="user",
            content="pedido de outro workspace",
            meta={"mode": "strategist", "model_preference": "auto"},
        )
        db.add_all([target_message, other_message])
        db.flush()
        db.add_all(
            [
                AuditLog(
                    workspace_id=target.id,
                    action="router.decision",
                    resource_type="message",
                    resource_id=target_message.id,
                    meta={"decision": _decision()},
                ),
                AuditLog(
                    workspace_id=target.id,
                    action="chat.live.failed",
                    resource_type="chat",
                    resource_id=target_chat.id,
                    meta={"message_id": target_message.id, "router_decision": _decision()},
                ),
                AuditLog(
                    workspace_id=other.id,
                    action="router.decision",
                    resource_type="message",
                    resource_id=other_message.id,
                    meta={"decision": _decision(provider="gemini", primary="gemini")},
                ),
            ]
        )
        db.commit()
        ids = {
            "target_workspace": target.id,
            "other_workspace": other.id,
            "target_chat": target_chat.id,
            "other_chat": other_chat.id,
            "target_message": target_message.id,
            "other_message": other_message.id,
        }

    try:
        with SessionLocal() as db:
            candidates = extract_real_case_candidates(
                db,
                workspace_id=ids["target_workspace"],
                export_secret=EXPORT_SECRET,
            )
        assert len(candidates) == 1
        assert candidates[0].content_metrics.word_count == 6
    finally:
        with SessionLocal() as db:
            db.execute(
                delete(AuditLog).where(
                    AuditLog.workspace_id.in_(
                        [ids["target_workspace"], ids["other_workspace"]]
                    )
                )
            )
            db.execute(
                delete(Message).where(
                    Message.id.in_([ids["target_message"], ids["other_message"]])
                )
            )
            db.execute(
                delete(Chat).where(Chat.id.in_([ids["target_chat"], ids["other_chat"]]))
            )
            db.execute(
                delete(Workspace).where(
                    Workspace.id.in_([ids["target_workspace"], ids["other_workspace"]])
                )
            )
            db.commit()


def test_review_template_starts_rejected() -> None:
    candidate = _candidate()

    assert review_template([candidate]) == [
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
    ]


def test_promotion_requires_real_sanitization_and_emits_router_case_v1() -> None:
    candidate = _candidate("avalie o contrato confidencial do cliente alpha")
    review = RouterRealCaseReview(
        review_version=REAL_CASE_REVIEW_VERSION,
        candidate_id=candidate.candidate_id,
        disposition="accept",
        reviewer_alias="qa-router",
        rationale="paráfrase sem nomes ou dados do cliente",
        sanitized_content="avalie os riscos gerais de um contrato comercial",
        category="real-document",
    )

    promoted = promote_reviewed_cases(
        candidates=[candidate],
        reviews=[review],
        export_secret=EXPORT_SECRET,
    )

    assert len(promoted) == 1
    assert promoted[0].schema_version == "router-case-v1"
    assert promoted[0].case_id.startswith("real-")
    assert promoted[0].request.content == "avalie os riscos gerais de um contrato comercial"
    assert promoted[0].expected.allowed_provider_slugs == ["openai"]


def test_promotion_rejects_unchanged_raw_content() -> None:
    raw_content = "avalie um contrato sem qualquer identificador"
    candidate = _candidate(raw_content)
    review = RouterRealCaseReview(
        review_version=REAL_CASE_REVIEW_VERSION,
        candidate_id=candidate.candidate_id,
        disposition="accept",
        reviewer_alias="qa-router",
        rationale="teste negativo",
        sanitized_content=raw_content,
        category="real-document",
    )

    with pytest.raises(ValueError, match="matches raw content"):
        promote_reviewed_cases(
            candidates=[candidate],
            reviews=[review],
            export_secret=EXPORT_SECRET,
        )


@pytest.mark.parametrize(
    ("content", "violation"),
    [
        ("fale com pessoa@example.com", "email"),
        ("cpf 123.456.789-00", "brazil_document"),
        ("telefone +55 11 99999-9999", "phone"),
        ("servidor 10.10.20.80", "ip_address"),
        ("acesse https://intranet.exemplo.local", "url"),
        ("api_key=segredo-super-longo-123456", "secret_or_token"),
    ],
)
def test_sanitization_scanner_blocks_sensitive_patterns(content: str, violation: str) -> None:
    assert violation in sanitization_violations(content)
