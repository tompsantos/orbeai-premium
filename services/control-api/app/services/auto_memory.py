from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Chat, Memory
from app.services.memory_context import normalize_text
from app.services.workspace_policies import allows_inferred_memory, inferred_memory_threshold


@dataclass(frozen=True)
class MemoryWriteEvent:
    memory_id: str
    label: str
    status: str
    action: str
    reason: str


EXPLICIT_PATTERNS = [
    r"\blembra que\b",
    r"\blembre que\b",
    r"\bguarda isso\b",
    r"\bguarde isso\b",
    r"\bgrava isso\b",
    r"\bgrave isso\b",
    r"\bsalva isso\b",
    r"\bsalve isso\b",
    r"\bmemoriza\b",
    r"\bnão esquece\b",
    r"\bnao esquece\b",
]

NEGATIVE_PATTERNS = [
    r"\bnão guarde\b",
    r"\bnao guarde\b",
    r"\bnão grave\b",
    r"\bnao grave\b",
    r"\bnão lembra\b",
    r"\bnao lembra\b",
    r"\bnão memorize\b",
    r"\bnao memorize\b",
]

SENSITIVE_PATTERNS = [
    r"\bsenha\b",
    r"\btoken\b",
    r"\bapi[_\s-]?key\b",
    r"\bchave privada\b",
    r"\bsegredo\b",
    r"\bcart[aã]o\b",
    r"\bcpf\b",
    r"\brg\b",
    r"\bpix\b",
]


def has_any(patterns: list[str], text: str) -> bool:
    return any(re.search(pattern, text) for pattern in patterns)


def clean_memory_content(content: str) -> str:
    clean = content.strip()

    clean = re.sub(
        r"^\s*(lembra que|lembre que|guarda isso:?|guarde isso:?|grava isso:?|grave isso:?|salva isso:?|salve isso:?|memoriza:?|não esquece:?|nao esquece:?)\s*",
        "",
        clean,
        flags=re.IGNORECASE,
    )

    return " ".join(clean.split())


def relevance_score(content: str) -> tuple[float, str]:
    text = normalize_text(content)
    score = 0.0
    reasons: list[str] = []

    if re.search(r"\bme chama de\b", text):
        score += 0.95
        reasons.append("nome ou forma de tratamento")

    if re.search(r"\b(eu|meu|minha|meus|minhas)\b.*\b(prefiro|gosto|nao gosto|odeio|quero|preciso|uso|moro|sou|trabalho|estudo)\b", text):
        score += 0.75
        reasons.append("preferência ou dado pessoal durável")

    if re.search(r"\b(sempre|nunca|padrao|padrão|fica definido|decidido|ta decidido|tá decidido)\b", text):
        score += 0.7
        reasons.append("regra ou decisão durável")

    if re.search(r"\b(orbeone|orbeai|orberadar|orberisk|orbeauto|orbevault)\b", text) and re.search(r"\b(eh|é|sera|será|deve|produto|projeto|stack|padrao|padrão|decidido)\b", text):
        score += 0.8
        reasons.append("definição de produto/projeto")

    if len(content) > 500:
        score -= 0.2
        reasons.append("mensagem longa demais para memória direta")

    return min(score, 1.0), ", ".join(reasons) or "relevância semântica"


def build_label(content: str) -> str:
    clean = clean_memory_content(content)

    if len(clean) <= 76:
        return clean

    return clean[:73].rstrip() + "…"


def should_skip_memory(content: str) -> bool:
    text = normalize_text(content)

    if len(content.strip()) < 12:
        return True

    if has_any(NEGATIVE_PATTERNS, text):
        return True

    if has_any(SENSITIVE_PATTERNS, text):
        return True

    return False


def existing_memory(db: Session, workspace_id: str, content: str) -> Memory | None:
    normalized = clean_memory_content(content).lower()

    return db.scalar(
        select(Memory)
        .where(Memory.workspace_id == workspace_id)
        .where(func.lower(Memory.content) == normalized)
        .limit(1)
    )


def maybe_create_auto_memory(
    db: Session,
    chat: Chat,
    user_message_id: str,
    content: str,
    memory_policy: str = "balanced",
) -> MemoryWriteEvent | None:
    if should_skip_memory(content):
        return None

    normalized = normalize_text(content)
    explicit = has_any(EXPLICIT_PATTERNS, normalized)

    score, reason = relevance_score(content)

    if not explicit and not allows_inferred_memory(memory_policy):
        return None

    if not explicit and score < inferred_memory_threshold(memory_policy):
        return None

    memory_content = clean_memory_content(content)

    if len(memory_content) < 12:
        return None

    if existing_memory(db, chat.workspace_id, memory_content):
        return None

    status = "ativa" if explicit else "pendente"
    confidence = 0.96 if explicit else max(score, 0.78)
    scope = "projeto" if chat.project_id else "global"

    memory = Memory(
        workspace_id=chat.workspace_id,
        project_id=chat.project_id,
        product=None,
        label=build_label(memory_content),
        content=memory_content,
        scope=scope,
        status=status,
        sensitivity="normal",
        confidence=confidence,
        source_type="chat",
        source_product="orbeAI",
        source_entity_id=user_message_id,
    )

    db.add(memory)
    db.commit()
    db.refresh(memory)

    action = "created_explicit" if explicit else "created_inferred"

    return MemoryWriteEvent(
        memory_id=memory.id,
        label=memory.label,
        status=memory.status,
        action=action,
        reason="pedido explícito do usuário" if explicit else reason,
    )
