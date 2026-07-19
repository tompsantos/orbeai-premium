from __future__ import annotations

import json
import secrets
from collections import Counter
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.services.router_evaluation import RouterCaseExpected
from app.services.router_real_case_review_io import (
    RouterRealCaseReviewSource,
    extract_real_case_review_sources,
    review_sanitization_violations,
    secure_write_json,
    secure_write_jsonl,
)
from app.services.router_real_cases import (
    RouterRealCaseCandidate,
    RouterRealCaseReview,
    load_jsonl,
    promote_reviewed_cases,
    review_template,
)

REVIEW_SESSION_VERSION = "router-real-case-review-session-v1"
type CriticalRealCaseCategory = Literal[
    "conversation",
    "software",
    "document",
    "research",
    "risk-sensitivity",
    "execution-boundary",
]
CRITICAL_REAL_CASE_CATEGORIES: tuple[str, ...] = (
    "conversation",
    "software",
    "document",
    "research",
    "risk-sensitivity",
    "execution-boundary",
)


class ReviewAttestation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    no_personal_names_or_identifiers: bool = False
    no_internal_infrastructure: bool = False
    not_verbatim: bool = False
    expectation_reviewed: bool = False

    @property
    def complete(self) -> bool:
        return all(
            (
                self.no_personal_names_or_identifiers,
                self.no_internal_infrastructure,
                self.not_verbatim,
                self.expectation_reviewed,
            )
        )


class ReviewUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    disposition: Literal["accept", "reject"]
    reviewer_alias: str
    rationale: str
    sanitized_content: str | None = None
    category: CriticalRealCaseCategory | None = None
    expected_override: RouterCaseExpected | None = None
    attestation: ReviewAttestation


class RouterRealCaseReviewSession:
    def __init__(
        self,
        *,
        sources: list[RouterRealCaseReviewSource],
        reviews: list[RouterRealCaseReview],
        export_secret: str,
        reviews_path: Path,
        summary_path: Path,
        session_url: str,
        attestations: dict[str, ReviewAttestation] | None = None,
    ) -> None:
        self.sources = {source.candidate.candidate_id: source for source in sources}
        self.candidates = {
            source.candidate.candidate_id: source.candidate for source in sources
        }
        self.reviews = {review.candidate_id: review for review in reviews}
        if len(self.sources) != len(sources):
            raise ValueError("review sources contain duplicate candidate ids")
        if len(self.reviews) != len(reviews):
            raise ValueError("review file contains duplicate candidate ids")
        self.attestations = {
            candidate_id: (attestations or {}).get(candidate_id, ReviewAttestation())
            for candidate_id in self.candidates
        }
        self.export_secret = export_secret
        self.reviews_path = reviews_path
        self.summary_path = summary_path
        self.session_url = session_url
        self.finished = False

        if set(self.candidates) != set(self.reviews):
            raise ValueError("review file must contain exactly one row for every candidate")
        self.persist()

    def safe_candidates(self) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for candidate_id, candidate in self.candidates.items():
            review = self.reviews[candidate_id]
            result.append(
                {
                    "candidate_id": candidate_id,
                    "source_day": candidate.source_day,
                    "source_action": candidate.source_action,
                    "content_metrics": candidate.content_metrics.model_dump(mode="json"),
                    "request": candidate.request.model_dump(mode="json"),
                    "environment": candidate.environment.model_dump(mode="json"),
                    "observed": candidate.observed.model_dump(mode="json"),
                    "review": review.model_dump(mode="json"),
                    "attestation": self.attestations[candidate_id].model_dump(mode="json"),
                }
            )
        return result

    def raw_source(self, candidate_id: str) -> str:
        source = self.sources.get(candidate_id)
        if source is None:
            raise KeyError(candidate_id)
        return source.raw_content

    def save_review(self, candidate_id: str, update: ReviewUpdate) -> RouterRealCaseReview:
        candidate = self.candidates.get(candidate_id)
        if candidate is None:
            raise KeyError(candidate_id)

        review = RouterRealCaseReview(
            review_version="router-real-case-review-v1",
            candidate_id=candidate_id,
            disposition=update.disposition,
            reviewer_alias=update.reviewer_alias,
            rationale=update.rationale,
            sanitized_content=update.sanitized_content,
            category=update.category,
            expected_override=update.expected_override,
        )
        if review.disposition == "accept":
            if not update.attestation.complete:
                raise ValueError("accepted review requires all privacy attestations")
            extended_violations = review_sanitization_violations(
                review.sanitized_content or ""
            )
            if extended_violations:
                raise ValueError(
                    "sanitized content still contains review-blocked patterns for "
                    f"{candidate_id}: {', '.join(extended_violations)}"
                )
            promote_reviewed_cases(
                candidates=[candidate],
                reviews=[review],
                export_secret=self.export_secret,
            )

        self.reviews[candidate_id] = review
        self.attestations[candidate_id] = update.attestation
        self.persist()
        return review

    def finish(self) -> dict[str, Any]:
        self.finished = True
        self.persist()
        return self.summary()

    def summary(self) -> dict[str, Any]:
        accepted = [review for review in self.reviews.values() if review.disposition == "accept"]
        category_counts = dict(
            sorted(
                Counter(
                    str(review.category)
                    for review in accepted
                    if review.category is not None
                ).items()
            )
        )
        reviewed_count = sum(
            1
            for review in self.reviews.values()
            if review.reviewer_alias != "preencher"
            and review.rationale != "preencher antes de aceitar"
        )
        accepted_ids = {review.candidate_id for review in accepted}
        accepted_attestation_count = sum(
            1
            for candidate_id in accepted_ids
            if self.attestations[candidate_id].complete
        )
        explicit_rejected_count = sum(
            1
            for review in self.reviews.values()
            if review.disposition == "reject"
            and review.reviewer_alias != "preencher"
            and review.rationale != "preencher antes de aceitar"
        )
        coverage_ready = (
            len(accepted) >= 12
            and accepted_attestation_count == len(accepted)
            and all(category_counts.get(category, 0) >= 2 for category in CRITICAL_REAL_CASE_CATEGORIES)
        )
        return {
            "session_version": REVIEW_SESSION_VERSION,
            "status": "finished" if self.finished else "active",
            "session_url": self.session_url,
            "candidate_count": len(self.candidates),
            "reviewed_count": reviewed_count,
            "accepted_count": len(accepted),
            "accepted_attestation_count": accepted_attestation_count,
            "explicit_rejected_count": explicit_rejected_count,
            "pending_review_count": len(self.reviews) - reviewed_count,
            "category_counts": category_counts,
            "required_categories": {
                category: 2 for category in CRITICAL_REAL_CASE_CATEGORIES
            },
            "phase5_coverage_ready": coverage_ready,
            "raw_content_in_files": False,
            "raw_content_transport": "memory-and-loopback-only",
            "attestations": {
                candidate_id: attestation.model_dump(mode="json")
                for candidate_id, attestation in self.attestations.items()
            },
            "reviews_file": self.reviews_path.name,
        }

    def persist(self) -> None:
        ordered_reviews = [
            self.reviews[candidate_id] for candidate_id in self.candidates
        ]
        secure_write_jsonl(self.reviews_path, ordered_reviews)
        secure_write_json(self.summary_path, self.summary())


def prepare_review_session(
    db: Session,
    *,
    workspace_id: str,
    export_secret: str,
    candidates_path: Path,
    reviews_path: Path,
    summary_path: Path,
    session_url: str,
    limit: int,
    resume: bool,
) -> RouterRealCaseReviewSession:
    sources = extract_real_case_review_sources(
        db,
        workspace_id=workspace_id,
        export_secret=export_secret,
        limit=limit,
    )
    if not sources:
        raise ValueError("no eligible router decisions were found for the workspace")

    source_map = {source.candidate.candidate_id: source for source in sources}
    if resume:
        if not candidates_path.exists() or not reviews_path.exists():
            raise ValueError("resume requires existing candidate and review files")
        candidates = [
            item
            for item in load_jsonl(candidates_path, RouterRealCaseCandidate)
            if isinstance(item, RouterRealCaseCandidate)
        ]
        reviews = [
            item
            for item in load_jsonl(reviews_path, RouterRealCaseReview)
            if isinstance(item, RouterRealCaseReview)
        ]
        missing = sorted(
            candidate.candidate_id
            for candidate in candidates
            if candidate.candidate_id not in source_map
        )
        if missing:
            raise ValueError(
                "some candidates are no longer available in the selected extraction window"
            )
        mismatched = sorted(
            candidate.candidate_id
            for candidate in candidates
            if source_map[candidate.candidate_id].candidate.model_dump(mode="json")
            != candidate.model_dump(mode="json")
        )
        if mismatched:
            raise ValueError("candidate snapshot no longer matches the audited source")
        session_sources = [source_map[candidate.candidate_id] for candidate in candidates]
        attestations: dict[str, ReviewAttestation] = {}
        if summary_path.exists():
            raw_summary = json.loads(summary_path.read_text(encoding="utf-8"))
            raw_attestations = raw_summary.get("attestations") or {}
            if isinstance(raw_attestations, dict):
                attestations = {
                    str(candidate_id): ReviewAttestation.model_validate(value)
                    for candidate_id, value in raw_attestations.items()
                    if candidate_id in source_map
                }
    else:
        if candidates_path.exists() or reviews_path.exists():
            raise ValueError("candidate or review file already exists; use --resume")
        session_sources = sources
        candidates = [source.candidate for source in session_sources]
        reviews = [
            RouterRealCaseReview.model_validate(item)
            for item in review_template(candidates)
        ]
        secure_write_jsonl(candidates_path, candidates)
        attestations = {}

    return RouterRealCaseReviewSession(
        sources=session_sources,
        reviews=reviews,
        export_secret=export_secret,
        reviews_path=reviews_path,
        summary_path=summary_path,
        session_url=session_url,
        attestations=attestations,
    )


def validate_phase5_review_session(
    *,
    reviews: list[RouterRealCaseReview],
    summary_path: Path,
) -> dict[str, Any]:
    payload = json.loads(summary_path.read_text(encoding="utf-8"))
    if payload.get("session_version") != REVIEW_SESSION_VERSION:
        raise ValueError("review summary uses an unsupported session version")

    raw_attestations = payload.get("attestations")
    if not isinstance(raw_attestations, dict):
        raise ValueError("review summary does not contain attestations")

    accepted = [review for review in reviews if review.disposition == "accept"]
    category_counts = Counter(
        str(review.category) for review in accepted if review.category is not None
    )
    if len(accepted) < 12:
        raise ValueError("phase 5 requires at least 12 accepted real cases")
    missing_categories = [
        category
        for category in CRITICAL_REAL_CASE_CATEGORIES
        if category_counts.get(category, 0) < 2
    ]
    if missing_categories:
        raise ValueError(
            "phase 5 category coverage is incomplete: " + ", ".join(missing_categories)
        )

    for review in accepted:
        attestation_payload = raw_attestations.get(review.candidate_id)
        if attestation_payload is None:
            raise ValueError(
                f"accepted review has no attestation: {review.candidate_id}"
            )
        attestation = ReviewAttestation.model_validate(attestation_payload)
        if not attestation.complete:
            raise ValueError(
                f"accepted review has incomplete attestation: {review.candidate_id}"
            )
        violations = review_sanitization_violations(review.sanitized_content or "")
        if violations:
            raise ValueError(
                "accepted review contains blocked patterns for "
                f"{review.candidate_id}: {', '.join(violations)}"
            )

    return payload


def run_review_session(
    db: Session,
    *,
    workspace_id: str,
    export_secret: str,
    candidates_path: Path,
    reviews_path: Path,
    summary_path: Path,
    limit: int,
    port: int,
    resume: bool,
) -> int:
    if not 1 <= port <= 65_535:
        raise ValueError("port must be between 1 and 65535")

    import uvicorn

    token = secrets.token_urlsafe(32)
    session_url = f"http://127.0.0.1:{port}/session/{token}"
    session = prepare_review_session(
        db,
        workspace_id=workspace_id,
        export_secret=export_secret,
        candidates_path=candidates_path,
        reviews_path=reviews_path,
        summary_path=summary_path,
        session_url=session_url,
        limit=max(1, min(limit, 1_000)),
        resume=resume,
    )
    db.close()

    server_holder: dict[str, uvicorn.Server] = {}

    def shutdown() -> None:
        server = server_holder.get("server")
        if server is not None:
            server.should_exit = True

    from app.services.router_real_case_review_web import create_review_app

    app = create_review_app(
        session=session,
        token=token,
        shutdown_callback=shutdown,
    )
    config = uvicorn.Config(
        app,
        host="127.0.0.1",
        port=port,
        access_log=False,
        log_level="critical",
    )
    server = uvicorn.Server(config)
    server_holder["server"] = server

    print(str(summary_path.resolve()))
    server.run()
    return 0
