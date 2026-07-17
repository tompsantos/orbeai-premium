from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import FeatureFlag
from app.schemas.feature_flags import FeatureFlagRead, FeatureFlagUpdate
from app.services.audit import write_audit_log
from app.services.bootstrap import get_or_create_default_workspace
from app.services.feature_flags import ensure_default_flags, get_feature_flag

router = APIRouter(prefix="/feature-flags", tags=["feature-flags"])


def get_flag_or_404(db: Session, workspace_id: str, key: str) -> FeatureFlag:
    flag = get_feature_flag(db, workspace_id, key)

    if flag is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feature flag not found",
        )

    return flag


@router.get("", response_model=list[FeatureFlagRead])
def list_feature_flags(db: Session = Depends(get_db)) -> list[FeatureFlag]:
    workspace = get_or_create_default_workspace(db)
    ensure_default_flags(db, workspace.id)

    return list(
        db.scalars(
            select(FeatureFlag)
            .where(FeatureFlag.workspace_id == workspace.id)
            .order_by(FeatureFlag.key.asc())
        )
    )


@router.patch("/{key}", response_model=FeatureFlagRead)
def update_feature_flag(
    key: str,
    payload: FeatureFlagUpdate,
    db: Session = Depends(get_db),
) -> FeatureFlag:
    workspace = get_or_create_default_workspace(db)
    flag = get_flag_or_404(db, workspace.id, key)
    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(flag, field, value)

    write_audit_log(
        db=db,
        workspace_id=workspace.id,
        action="feature_flag.update",
        resource_type="feature_flag",
        resource_id=flag.key,
        meta={
            "changes": list(changes.keys()),
            "enabled": flag.enabled,
            "audience": flag.audience,
        },
    )

    db.add(flag)
    db.commit()
    db.refresh(flag)

    return flag


@router.post("/{key}/toggle", response_model=FeatureFlagRead)
def toggle_feature_flag(key: str, db: Session = Depends(get_db)) -> FeatureFlag:
    workspace = get_or_create_default_workspace(db)
    flag = get_flag_or_404(db, workspace.id, key)
    flag.enabled = not flag.enabled

    write_audit_log(
        db=db,
        workspace_id=workspace.id,
        action="feature_flag.toggle",
        resource_type="feature_flag",
        resource_id=flag.key,
        meta={
            "enabled": flag.enabled,
            "audience": flag.audience,
        },
    )

    db.add(flag)
    db.commit()
    db.refresh(flag)

    return flag
