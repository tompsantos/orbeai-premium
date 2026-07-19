from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import Workspace
from app.schemas.workspace import (
    WorkspaceRead,
    WorkspaceSettingsRead,
    WorkspaceSettingsUpdate,
    WorkspaceUpdate,
)
from app.services.audit import write_audit_log
from app.services.model_controls import MODEL_CONTROLS_META_KEY
from app.services.workspace_settings import get_or_create_workspace_settings

router = APIRouter(prefix="/workspace", tags=["workspace"])

_RESERVED_META_KEYS = {"provider_credentials", MODEL_CONTROLS_META_KEY}


def _public_meta(meta: dict[str, Any] | None) -> dict[str, Any] | None:
    if meta is None:
        return None
    return {key: value for key, value in meta.items() if key not in _RESERVED_META_KEYS}


def to_workspace_settings_read(settings: object) -> WorkspaceSettingsRead:
    return WorkspaceSettingsRead(
        id=settings.id,
        workspace_id=settings.workspace_id,
        locale=settings.locale,
        timezone=settings.timezone,
        default_chat_mode=settings.default_chat_mode,
        default_model_preference=settings.default_model_preference,
        memory_policy=settings.memory_policy,
        data_retention_days=settings.data_retention_days,
        allow_exports=settings.allow_exports,
        allow_public_sharing=settings.allow_public_sharing,
        meta=_public_meta(settings.meta),
        created_at=settings.created_at,
        updated_at=settings.updated_at,
    )


def to_workspace_read(workspace: Workspace, settings: object) -> WorkspaceRead:
    return WorkspaceRead(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        plan=workspace.plan,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        settings=to_workspace_settings_read(settings),
    )


@router.get("", response_model=WorkspaceRead)
def get_workspace(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> WorkspaceRead:
    workspace = context.workspace
    settings = get_or_create_workspace_settings(db, workspace)
    return to_workspace_read(workspace, settings)


@router.patch("", response_model=WorkspaceRead)
def update_workspace(
    payload: WorkspaceUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> WorkspaceRead:
    workspace = context.workspace
    settings = get_or_create_workspace_settings(db, workspace)
    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(workspace, field, value)

    write_audit_log(
        db=db,
        workspace_id=workspace.id,
        action="workspace.update",
        resource_type="workspace",
        resource_id=workspace.id,
        meta={
            "changes": list(changes.keys()),
            "auth_user_id": context.user_id,
            "membership_role": context.role,
            "name": workspace.name,
            "plan": workspace.plan,
        },
    )

    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return to_workspace_read(workspace, settings)


@router.patch("/settings", response_model=WorkspaceSettingsRead)
def update_workspace_settings(
    payload: WorkspaceSettingsUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> WorkspaceSettingsRead:
    workspace = context.workspace
    settings = get_or_create_workspace_settings(db, workspace)
    changes = payload.model_dump(exclude_unset=True)

    requested_meta = changes.get("meta")
    if isinstance(requested_meta, dict) and _RESERVED_META_KEYS.intersection(requested_meta):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reserved workspace metadata cannot be changed through this endpoint",
        )

    for field, value in changes.items():
        if field == "meta":
            protected = {
                key: value
                for key, value in dict(settings.meta or {}).items()
                if key in _RESERVED_META_KEYS
            }
            settings.meta = {**dict(value or {}), **protected}
            continue
        setattr(settings, field, value)

    write_audit_log(
        db=db,
        workspace_id=workspace.id,
        action="workspace.settings.update",
        resource_type="workspace_settings",
        resource_id=settings.id,
        meta={
            "changes": list(changes.keys()),
            "auth_user_id": context.user_id,
            "membership_role": context.role,
            "locale": settings.locale,
            "timezone": settings.timezone,
            "default_chat_mode": settings.default_chat_mode,
            "default_model_preference": settings.default_model_preference,
            "memory_policy": settings.memory_policy,
        },
    )

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return to_workspace_settings_read(settings)
