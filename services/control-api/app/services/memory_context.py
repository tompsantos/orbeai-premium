from __future__ import annotations

import re
import unicodedata

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import Memory

STOPWORDS = {
    "a", "o", "os", "as", "um", "uma", "uns", "umas",
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "e", "ou", "que", "pra", "para", "por", "com", "sem",
    "eu", "me", "meu", "minha", "meus", "minhas",
    "voce", "você", "tu", "ele", "ela", "isso", "esse", "essa",
    "como", "qual", "quais", "quando", "onde", "porque", "porquê",
}


def normalize_text(value: str) -> str:
    without_accents = unicodedata.normalize("NFKD", value)
    without_accents = "".join(ch for ch in without_accents if not unicodedata.combining(ch))
    return without_accents.lower()


def tokenize(value: str) -> set[str]:
    normalized = normalize_text(value)
    words = re.findall(r"[a-zA-Z0-9_]{3,}", normalized)

    return {word for word in words if word not in STOPWORDS}


def score_memory(memory: Memory, query: str, project_id: str | None) -> float:
    query_tokens = tokenize(query)

    if not query_tokens:
        return 0.0

    memory_text = f"{memory.label} {memory.content}"
    memory_tokens = tokenize(memory_text)

    if not memory_tokens:
        return 0.0

    overlap = query_tokens.intersection(memory_tokens)
    score = len(overlap) / max(len(query_tokens), 1)

    label_tokens = tokenize(memory.label)
    if query_tokens.intersection(label_tokens):
        score += 0.2

    if project_id and memory.project_id == project_id:
        score += 0.15

    if memory.scope in {"global", "workspace"}:
        score += 0.05

    if memory.confidence is not None:
        score += min(max(memory.confidence, 0.0), 1.0) * 0.05

    return round(score, 4)


def select_relevant_memories(
    db: Session,
    workspace_id: str,
    project_id: str | None,
    query: str,
    limit: int = 6,
) -> list[Memory]:
    statement = (
        select(Memory)
        .where(Memory.workspace_id == workspace_id)
        .where(Memory.status.in_(["ativa", "active"]))
        .where(
            or_(
                Memory.scope.in_(["global", "workspace"]),
                Memory.project_id == project_id if project_id else Memory.project_id.is_(None),
            )
        )
    )

    memories = list(db.scalars(statement))
    scored = [
        (score_memory(memory, query=query, project_id=project_id), memory)
        for memory in memories
    ]

    scored = [(score, memory) for score, memory in scored if score >= 0.08]
    scored.sort(key=lambda item: item[0], reverse=True)

    return [memory for _, memory in scored[:limit]]


def compact(value: str, limit: int = 420) -> str:
    clean = " ".join(value.split())

    if len(clean) <= limit:
        return clean

    return clean[: limit - 1].rstrip() + "…"


def build_memory_context(memories: list[Memory]) -> str | None:
    if not memories:
        return None

    lines = [
        "memórias persistentes aprovadas e relevantes para esta conversa:",
    ]

    total_chars = 0

    for memory in memories:
        item = f"- {compact(memory.label, 90)}: {compact(memory.content, 420)}"
        total_chars += len(item)

        if total_chars > 2400:
            break

        lines.append(item)

    return "\n".join(lines)
