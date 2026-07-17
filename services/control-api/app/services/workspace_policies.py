from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models import Workspace
from app.services.workspace_settings import get_or_create_workspace_settings


@dataclass(frozen=True)
class WorkspacePolicy:
    workspace_id: str
    memory_policy: str
    data_retention_days: int
    allow_exports: bool
    allow_public_sharing: bool


def normalize_memory_policy(value: str | None) -> str:
    if value in {"strict", "balanced", "adaptive"}:
        return value

    return "balanced"


def get_workspace_policy(db: Session, workspace_id: str) -> WorkspacePolicy:
    workspace = db.get(Workspace, workspace_id)

    if workspace is None:
        raise ValueError(f"Workspace not found: {workspace_id}")

    settings = get_or_create_workspace_settings(db, workspace)

    return WorkspacePolicy(
        workspace_id=workspace.id,
        memory_policy=normalize_memory_policy(settings.memory_policy),
        data_retention_days=settings.data_retention_days,
        allow_exports=settings.allow_exports,
        allow_public_sharing=settings.allow_public_sharing,
    )


def inferred_memory_threshold(memory_policy: str) -> float:
    policy = normalize_memory_policy(memory_policy)

    if policy == "adaptive":
        return 0.72

    return 0.78


def allows_inferred_memory(memory_policy: str) -> bool:
    policy = normalize_memory_policy(memory_policy)

    return policy in {"balanced", "adaptive"}


def memory_context_limit(memory_policy: str) -> int:
    policy = normalize_memory_policy(memory_policy)

    if policy == "strict":
        return 3

    if policy == "adaptive":
        return 8

    return 6
