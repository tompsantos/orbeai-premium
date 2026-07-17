from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Memory, Project
from app.schemas.memories import MemoryCreate, MemoryRead, MemoryUpdate
from app.services.audit import write_audit_log
from app.services.bootstrap import get_or_create_default_workspace

router = APIRouter(prefix="/memories", tags=["memories"])


def get_project_or_404(project_id: str, db: Session) -> Project:
    project = db.get(Project, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


def get_memory_or_404(memory_id: str, db: Session) -> Memory:
    memory = db.get(Memory, memory_id)

    if memory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    return memory


@router.post("", response_model=MemoryRead, status_code=status.HTTP_201_CREATED)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db)) -> Memory:
    workspace = get_or_create_default_workspace(db)
    project_id = payload.project_id

    if project_id is not None:
        project = get_project_or_404(project_id, db)
        workspace_id = project.workspace_id
    else:
        workspace_id = workspace.id

    memory = Memory(
        workspace_id=workspace_id,
        project_id=project_id,
        product=payload.product,
        label=payload.label,
        content=payload.content,
        scope=payload.scope,
        status=payload.status,
        sensitivity=payload.sensitivity,
        confidence=payload.confidence,
        source_type=payload.source_type,
        source_product=payload.source_product,
        source_entity_id=payload.source_entity_id,
    )

    db.add(memory)

    write_audit_log(
        db=db,
        workspace_id=memory.workspace_id,
        action="memory.create",
        resource_type="memory",
        resource_id=memory.id,
        meta={
            "label": memory.label,
            "scope": memory.scope,
            "status": memory.status,
            "source_type": memory.source_type,
        },
    )

    db.commit()
    db.refresh(memory)

    return memory


@router.get("", response_model=list[MemoryRead])
def list_memories(
    scope: str | None = Query(default=None),
    status: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Memory]:
    statement = select(Memory)

    if scope is not None:
        statement = statement.where(Memory.scope == scope)

    if status is not None:
        statement = statement.where(Memory.status == status)

    if project_id is not None:
        statement = statement.where(Memory.project_id == project_id)

    if q:
        term = f"%{q.lower()}%"
        statement = statement.where(
            or_(
                Memory.label.ilike(term),
                Memory.content.ilike(term),
            )
        )

    result = db.scalars(statement.order_by(Memory.updated_at.desc()))

    return list(result)


@router.get("/{memory_id}", response_model=MemoryRead)
def get_memory(memory_id: str, db: Session = Depends(get_db)) -> Memory:
    return get_memory_or_404(memory_id, db)


@router.patch("/{memory_id}", response_model=MemoryRead)
def update_memory(
    memory_id: str,
    payload: MemoryUpdate,
    db: Session = Depends(get_db),
) -> Memory:
    memory = get_memory_or_404(memory_id, db)
    changes = payload.model_dump(exclude_unset=True)

    if "project_id" in changes:
        project_id = changes.pop("project_id")

        if project_id is None:
            memory.project_id = None
        else:
            project = get_project_or_404(project_id, db)
            memory.project_id = project.id
            memory.workspace_id = project.workspace_id

    for field, value in changes.items():
        setattr(memory, field, value)

    db.add(memory)

    write_audit_log(
        db=db,
        workspace_id=memory.workspace_id,
        action="memory.update",
        resource_type="memory",
        resource_id=memory.id,
        meta={
            "changes": list(changes.keys()),
            "status": memory.status,
        },
    )

    db.commit()
    db.refresh(memory)

    return memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_memory(memory_id: str, db: Session = Depends(get_db)) -> None:
    memory = db.get(Memory, memory_id)

    if memory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found",
        )

    workspace_id = memory.workspace_id

    db.execute(delete(Memory).where(Memory.id == memory_id))

    write_audit_log(
        db=db,
        workspace_id=workspace_id,
        action="memory.delete",
        resource_type="memory",
        resource_id=memory_id,
    )

    db.commit()

    return None
