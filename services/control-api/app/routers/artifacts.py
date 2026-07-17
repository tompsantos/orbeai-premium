from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.models import Artifact, ArtifactVersion, Project
from app.models.core import utc_now
from app.services.audit import write_audit_log
from app.services.feature_flags import is_feature_enabled
from app.services.workspace_policies import get_workspace_policy
from app.schemas.artifacts import (
    ArtifactCreate,
    ArtifactRead,
    ArtifactUpdate,
    ArtifactVersionCreate,
    ArtifactVersionRead,
    ArtifactExportRead,
)
from app.services.bootstrap import get_or_create_default_workspace

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


def get_project_or_404(project_id: str, db: Session) -> Project:
    project = db.get(Project, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


def get_artifact_or_404(artifact_id: str, db: Session) -> Artifact:
    artifact = db.scalar(
        select(Artifact)
        .where(Artifact.id == artifact_id)
        .options(selectinload(Artifact.versions))
    )

    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found",
        )

    return artifact


def next_version_number(artifact_id: str, db: Session) -> int:
    current = db.scalar(
        select(func.coalesce(func.max(ArtifactVersion.version_number), 0))
        .where(ArtifactVersion.artifact_id == artifact_id)
    )

    return int(current or 0) + 1


@router.post("", response_model=ArtifactRead, status_code=status.HTTP_201_CREATED)
def create_artifact(payload: ArtifactCreate, db: Session = Depends(get_db)) -> Artifact:
    workspace = get_or_create_default_workspace(db)
    project_id = payload.project_id

    if project_id is not None:
        project = get_project_or_404(project_id, db)
        workspace_id = project.workspace_id
    else:
        workspace_id = workspace.id

    artifact = Artifact(
        workspace_id=workspace_id,
        project_id=project_id,
        title=payload.title,
        kind=payload.kind,
        status="draft",
        source_type=payload.source_type,
        source_product=payload.source_product,
        source_entity_id=payload.source_entity_id,
    )

    db.add(artifact)
    db.commit()
    db.refresh(artifact)

    version = ArtifactVersion(
        artifact_id=artifact.id,
        version_number=1,
        content=payload.content,
    )

    db.add(version)

    write_audit_log(
        db=db,
        workspace_id=artifact.workspace_id,
        action="artifact.create",
        resource_type="artifact",
        resource_id=artifact.id,
        meta={
            "title": artifact.title,
            "kind": artifact.kind,
            "version_number": 1,
        },
    )

    db.commit()

    return get_artifact_or_404(artifact.id, db)


@router.get("", response_model=list[ArtifactRead])
def list_artifacts(
    project_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Artifact]:
    statement = select(Artifact).options(selectinload(Artifact.versions))

    if project_id is not None:
        statement = statement.where(Artifact.project_id == project_id)

    result = db.scalars(statement.order_by(Artifact.updated_at.desc()))

    return list(result)



@router.get("/{artifact_id}/export", response_model=ArtifactExportRead)
def export_artifact(artifact_id: str, db: Session = Depends(get_db)) -> dict:
    artifact = get_artifact_or_404(artifact_id, db)
    policy = get_workspace_policy(db, artifact.workspace_id)

    if not policy.allow_exports:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Artifact exports disabled by workspace policy.",
        )

    if not artifact.versions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact has no versions to export.",
        )

    latest_version = max(artifact.versions, key=lambda version: version.version_number)

    write_audit_log(
        db=db,
        workspace_id=artifact.workspace_id,
        action="artifact.export",
        resource_type="artifact",
        resource_id=artifact.id,
        meta={
            "title": artifact.title,
            "kind": artifact.kind,
            "version_number": latest_version.version_number,
            "allow_exports": policy.allow_exports,
        },
    )

    db.commit()

    return {
        "artifact_id": artifact.id,
        "title": artifact.title,
        "kind": artifact.kind,
        "version_number": latest_version.version_number,
        "content": latest_version.content,
        "exported_at": utc_now(),
    }


@router.get("/{artifact_id}", response_model=ArtifactRead)
def get_artifact(artifact_id: str, db: Session = Depends(get_db)) -> Artifact:
    return get_artifact_or_404(artifact_id, db)


@router.patch("/{artifact_id}", response_model=ArtifactRead)
def update_artifact(
    artifact_id: str,
    payload: ArtifactUpdate,
    db: Session = Depends(get_db),
) -> Artifact:
    artifact = get_artifact_or_404(artifact_id, db)
    changes = payload.model_dump(exclude_unset=True)

    if "project_id" in changes:
        project_id = changes.pop("project_id")

        if project_id is None:
            artifact.project_id = None
        else:
            project = get_project_or_404(project_id, db)
            artifact.project_id = project.id
            artifact.workspace_id = project.workspace_id

    for field, value in changes.items():
        setattr(artifact, field, value)

    db.add(artifact)

    write_audit_log(
        db=db,
        workspace_id=artifact.workspace_id,
        action="artifact.update",
        resource_type="artifact",
        resource_id=artifact.id,
        meta={
            "changes": list(changes.keys()),
        },
    )

    db.commit()

    return get_artifact_or_404(artifact.id, db)


@router.post("/{artifact_id}/versions", response_model=ArtifactVersionRead, status_code=status.HTTP_201_CREATED)
def create_artifact_version(
    artifact_id: str,
    payload: ArtifactVersionCreate,
    db: Session = Depends(get_db),
) -> ArtifactVersion:
    artifact = get_artifact_or_404(artifact_id, db)

    if not is_feature_enabled(
        db=db,
        workspace_id=artifact.workspace_id,
        key="artifact_versions",
        default=True,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Artifact versioning disabled by feature flag.",
        )

    version = ArtifactVersion(
        artifact_id=artifact.id,
        version_number=next_version_number(artifact.id, db),
        content=payload.content,
    )

    db.add(version)
    db.add(artifact)

    write_audit_log(
        db=db,
        workspace_id=artifact.workspace_id,
        action="artifact.version",
        resource_type="artifact",
        resource_id=artifact.id,
        meta={
            "version_number": version.version_number,
        },
    )

    db.commit()
    db.refresh(version)

    return version


@router.delete("/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artifact(artifact_id: str, db: Session = Depends(get_db)) -> None:
    artifact = db.get(Artifact, artifact_id)

    if artifact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artifact not found",
        )

    workspace_id = artifact.workspace_id

    db.execute(delete(ArtifactVersion).where(ArtifactVersion.artifact_id == artifact_id))
    db.delete(artifact)

    write_audit_log(
        db=db,
        workspace_id=workspace_id,
        action="artifact.delete",
        resource_type="artifact",
        resource_id=artifact_id,
    )

    db.commit()

    return None
