from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import KnowledgeMaterial, ResearchReport
from app.services.memory_context import compact, tokenize

KnowledgeSourceType = Literal["research_report", "knowledge_material"]


@dataclass(frozen=True)
class KnowledgeContextSource:
    source_id: str
    source_type: KnowledgeSourceType
    title: str
    kind: str
    score: float
    project_id: str | None
    excerpt: str
    metadata_only: bool = False


def _base_score(query: str, title: str, body: str) -> float:
    query_tokens = tokenize(query)
    if not query_tokens:
        return 0.0

    body_tokens = tokenize(f"{title} {body}")
    if not body_tokens:
        return 0.0

    overlap = query_tokens.intersection(body_tokens)
    score = len(overlap) / max(len(query_tokens), 1)

    if query_tokens.intersection(tokenize(title)):
        score += 0.2

    return score


def _project_boost(item_project_id: str | None, project_id: str | None) -> float:
    if project_id and item_project_id == project_id:
        return 0.15
    if item_project_id is None:
        return 0.05
    return 0.0


def _report_source(report: ResearchReport, query: str, project_id: str | None) -> KnowledgeContextSource | None:
    body = " ".join(
        part
        for part in [
            report.summary,
            " ".join(str(item) for item in report.plan or []),
            " ".join(str(item) for item in report.risks or []),
        ]
        if part
    )
    if not report.summary.strip():
        return None

    score = _base_score(query, report.question, body)
    score += _project_boost(report.project_id, project_id)

    if report.status == "concluído":
        score += 0.05

    return KnowledgeContextSource(
        source_id=report.id,
        source_type="research_report",
        title=report.question,
        kind="pesquisa",
        score=round(score, 4),
        project_id=report.project_id,
        excerpt=report.summary,
    )


def _material_source(
    material: KnowledgeMaterial,
    query: str,
    project_id: str | None,
) -> KnowledgeContextSource | None:
    if not material.excerpt.strip():
        return None

    score = _base_score(query, material.title, material.excerpt)
    score += _project_boost(material.project_id, project_id)
    score += min(max(material.confidence, 0.0), 1.0) * 0.05

    meta = material.meta or {}
    metadata_only = meta.get("content_stored") is False or meta.get("content_available") is False

    return KnowledgeContextSource(
        source_id=material.id,
        source_type="knowledge_material",
        title=material.title,
        kind=material.kind,
        score=round(score, 4),
        project_id=material.project_id,
        excerpt=material.excerpt,
        metadata_only=metadata_only,
    )


def select_relevant_knowledge(
    db: Session,
    workspace_id: str,
    project_id: str | None,
    query: str,
    limit: int = 6,
) -> list[KnowledgeContextSource]:
    scope_filter = (
        or_(ResearchReport.project_id == project_id, ResearchReport.project_id.is_(None))
        if project_id
        else ResearchReport.project_id.is_(None)
    )
    reports = list(
        db.scalars(
            select(ResearchReport)
            .where(ResearchReport.workspace_id == workspace_id)
            .where(scope_filter)
        )
    )

    material_scope_filter = (
        or_(KnowledgeMaterial.project_id == project_id, KnowledgeMaterial.project_id.is_(None))
        if project_id
        else KnowledgeMaterial.project_id.is_(None)
    )
    materials = list(
        db.scalars(
            select(KnowledgeMaterial)
            .where(KnowledgeMaterial.workspace_id == workspace_id)
            .where(material_scope_filter)
        )
    )

    candidates = [
        source
        for source in [
            *(_report_source(report, query, project_id) for report in reports),
            *(_material_source(material, query, project_id) for material in materials),
        ]
        if source is not None and source.score >= 0.08
    ]
    candidates.sort(key=lambda item: item.score, reverse=True)
    return candidates[:limit]


def build_knowledge_context(sources: list[KnowledgeContextSource]) -> str | None:
    if not sources:
        return None

    lines = [
        "conhecimento persistido selecionado para esta conversa:",
        "use somente os trechos fornecidos e nunca afirme ter lido conteúdo de arquivo que não foi armazenado.",
    ]
    total_chars = 0

    for source in sources:
        qualifier = " · apenas metadados/referência" if source.metadata_only else ""
        item = (
            f"- [{source.source_type}:{source.source_id}] "
            f"{compact(source.title, 120)} ({source.kind}{qualifier}): "
            f"{compact(source.excerpt, 560)}"
        )
        total_chars += len(item)
        if total_chars > 4_800:
            break
        lines.append(item)

    return "\n".join(lines)
