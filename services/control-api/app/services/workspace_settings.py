from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Workspace, WorkspaceSettings


def get_or_create_workspace_settings(db: Session, workspace: Workspace) -> WorkspaceSettings:
    settings = db.scalar(
        select(WorkspaceSettings).where(WorkspaceSettings.workspace_id == workspace.id)
    )

    if settings is not None:
        return settings

    settings = WorkspaceSettings(
        workspace_id=workspace.id,
        locale="pt-BR",
        timezone="America/Sao_Paulo",
        default_chat_mode="strategist",
        default_model_preference="auto",
        memory_policy="balanced",
        data_retention_days=365,
        allow_exports=True,
        allow_public_sharing=False,
        meta={
            "seeded": True,
            "product": "orbeAI",
        },
    )

    db.add(settings)
    db.commit()
    db.refresh(settings)

    return settings
