from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Workspace

DEFAULT_WORKSPACE_NAME = "orbeOne"
DEFAULT_WORKSPACE_SLUG = "orbeone"


def get_or_create_default_workspace(db: Session) -> Workspace:
    workspace = db.scalar(
        select(Workspace).where(Workspace.slug == DEFAULT_WORKSPACE_SLUG)
    )

    if workspace is not None:
        return workspace

    workspace = Workspace(
        name=DEFAULT_WORKSPACE_NAME,
        slug=DEFAULT_WORKSPACE_SLUG,
        plan="internal",
    )

    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    return workspace
