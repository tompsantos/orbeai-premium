from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import AuthContext, get_current_auth_context
from app.models import Workspace, WorkspaceMember


@dataclass(frozen=True)
class CurrentWorkspaceContext:
    auth: AuthContext
    workspace: Workspace
    membership: WorkspaceMember

    @property
    def user_id(self) -> str:
        return self.auth.user.id

    @property
    def workspace_id(self) -> str:
        return self.workspace.id

    @property
    def role(self) -> str:
        return self.membership.role


def get_current_workspace_context(
    auth: AuthContext = Depends(get_current_auth_context),
    db: Session = Depends(get_db),
) -> CurrentWorkspaceContext:
    membership = db.scalar(
        select(WorkspaceMember)
        .where(WorkspaceMember.user_id == auth.user.id)
        .where(WorkspaceMember.status == "active")
        .order_by(WorkspaceMember.created_at.asc())
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User has no active workspace membership",
        )

    workspace = db.get(Workspace, membership.workspace_id)

    if workspace is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workspace membership is invalid",
        )

    return CurrentWorkspaceContext(
        auth=auth,
        workspace=workspace,
        membership=membership,
    )
