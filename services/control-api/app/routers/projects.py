from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import Project
from app.schemas.projects import ProjectCreate, ProjectRead, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_or_404(project_id: str, workspace_id: str, db: Session) -> Project:
    project = db.scalar(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.workspace_id == workspace_id)
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> Project:
    project = Project(
        workspace_id=context.workspace_id,
        name=payload.name,
        slug=payload.slug,
        product=payload.product,
        description=payload.description,
        status="active",
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return project


@router.get("", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[Project]:
    result = db.scalars(
        select(Project)
        .where(Project.workspace_id == context.workspace_id)
        .order_by(Project.created_at.desc())
    )

    return list(result)


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> Project:
    return get_project_or_404(project_id, context.workspace_id, db)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: str,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> Project:
    project = get_project_or_404(project_id, context.workspace_id, db)
    changes = payload.model_dump(exclude_unset=True)

    for field, value in changes.items():
        setattr(project, field, value)

    db.add(project)
    db.commit()
    db.refresh(project)

    return project
