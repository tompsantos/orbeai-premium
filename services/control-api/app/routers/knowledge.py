from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies.workspace import CurrentWorkspaceContext, get_current_workspace_context
from app.models import KnowledgeMaterial, Project, ResearchReport
from app.schemas.knowledge import (
    KnowledgeMaterialCreate,
    KnowledgeMaterialRead,
    KnowledgeMaterialUpdate,
    ResearchReportCreate,
    ResearchReportRead,
    ResearchReportUpdate,
)
from app.services.audit import write_audit_log

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

DEFAULT_RESEARCH_PLAN = [
    "Quebrar a pergunta em hipóteses verificáveis",
    "Selecionar materiais e fontes relevantes",
    "Avaliar evidências e incertezas",
    "Preparar uma síntese rastreável",
]


def get_project_or_404(project_id: str, db: Session, workspace_id: str) -> Project:
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


def get_report_or_404(
    report_id: str,
    db: Session,
    workspace_id: str,
) -> ResearchReport:
    report = db.scalar(
        select(ResearchReport)
        .where(ResearchReport.id == report_id)
        .where(ResearchReport.workspace_id == workspace_id)
        .options(selectinload(ResearchReport.sources))
    )
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research report not found",
        )
    return report


def get_material_or_404(
    material_id: str,
    db: Session,
    workspace_id: str,
) -> KnowledgeMaterial:
    material = db.scalar(
        select(KnowledgeMaterial)
        .where(KnowledgeMaterial.id == material_id)
        .where(KnowledgeMaterial.workspace_id == workspace_id)
    )
    if material is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge material not found",
        )
    return material


def validate_report_id(
    report_id: str | None,
    db: Session,
    workspace_id: str,
) -> str | None:
    if report_id is None:
        return None
    return get_report_or_404(report_id, db, workspace_id).id


@router.post(
    "/reports",
    response_model=ResearchReportRead,
    status_code=status.HTTP_201_CREATED,
)
def create_report(
    payload: ResearchReportCreate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ResearchReport:
    if payload.project_id is not None:
        get_project_or_404(payload.project_id, db, context.workspace_id)

    report = ResearchReport(
        workspace_id=context.workspace_id,
        project_id=payload.project_id,
        question=payload.question,
        status=payload.status,
        plan=payload.plan or DEFAULT_RESEARCH_PLAN,
        summary=payload.summary,
        risks=payload.risks,
    )
    db.add(report)
    db.flush()

    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.report.create",
        resource_type="research_report",
        resource_id=report.id,
        meta={
            "question": report.question,
            "status": report.status,
            "project_id": report.project_id,
        },
    )
    db.commit()

    return get_report_or_404(report.id, db, context.workspace_id)


@router.get("/reports", response_model=list[ResearchReportRead])
def list_reports(
    project_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[ResearchReport]:
    statement = (
        select(ResearchReport)
        .where(ResearchReport.workspace_id == context.workspace_id)
        .options(selectinload(ResearchReport.sources))
    )
    if project_id is not None:
        statement = statement.where(ResearchReport.project_id == project_id)
    if q:
        statement = statement.where(ResearchReport.question.ilike(f"%{q}%"))

    result = db.scalars(statement.order_by(ResearchReport.updated_at.desc()))
    return list(result)


@router.get("/reports/{report_id}", response_model=ResearchReportRead)
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ResearchReport:
    return get_report_or_404(report_id, db, context.workspace_id)


@router.patch("/reports/{report_id}", response_model=ResearchReportRead)
def update_report(
    report_id: str,
    payload: ResearchReportUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> ResearchReport:
    report = get_report_or_404(report_id, db, context.workspace_id)
    changes = payload.model_dump(exclude_unset=True)

    if "project_id" in changes:
        project_id = changes.pop("project_id")
        if project_id is not None:
            get_project_or_404(project_id, db, context.workspace_id)
        report.project_id = project_id

    for field, value in changes.items():
        setattr(report, field, value)

    db.add(report)
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.report.update",
        resource_type="research_report",
        resource_id=report.id,
        meta={"changes": list(changes.keys()), "status": report.status},
    )
    db.commit()

    return get_report_or_404(report.id, db, context.workspace_id)


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> None:
    report = get_report_or_404(report_id, db, context.workspace_id)
    db.execute(
        update(KnowledgeMaterial)
        .where(KnowledgeMaterial.report_id == report.id)
        .values(report_id=None)
    )
    db.delete(report)
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.report.delete",
        resource_type="research_report",
        resource_id=report.id,
    )
    db.commit()
    return None


@router.post(
    "/materials",
    response_model=KnowledgeMaterialRead,
    status_code=status.HTTP_201_CREATED,
)
def create_material(
    payload: KnowledgeMaterialCreate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> KnowledgeMaterial:
    if payload.project_id is not None:
        get_project_or_404(payload.project_id, db, context.workspace_id)

    report_id = validate_report_id(payload.report_id, db, context.workspace_id)
    material = KnowledgeMaterial(
        workspace_id=context.workspace_id,
        project_id=payload.project_id,
        report_id=report_id,
        title=payload.title,
        kind=payload.kind,
        url=payload.url,
        excerpt=payload.excerpt,
        confidence=payload.confidence,
        source_type=payload.source_type,
        source_product=payload.source_product,
        source_entity_id=payload.source_entity_id,
        meta=payload.meta,
    )
    db.add(material)
    db.flush()

    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.material.create",
        resource_type="knowledge_material",
        resource_id=material.id,
        meta={
            "title": material.title,
            "kind": material.kind,
            "report_id": material.report_id,
            "source_type": material.source_type,
        },
    )
    db.commit()
    db.refresh(material)
    return material


@router.get("/materials", response_model=list[KnowledgeMaterialRead])
def list_materials(
    report_id: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> list[KnowledgeMaterial]:
    statement = select(KnowledgeMaterial).where(
        KnowledgeMaterial.workspace_id == context.workspace_id
    )
    if report_id is not None:
        statement = statement.where(KnowledgeMaterial.report_id == report_id)
    if project_id is not None:
        statement = statement.where(KnowledgeMaterial.project_id == project_id)
    if q:
        term = f"%{q}%"
        statement = statement.where(
            or_(
                KnowledgeMaterial.title.ilike(term),
                KnowledgeMaterial.excerpt.ilike(term),
            )
        )

    result = db.scalars(statement.order_by(KnowledgeMaterial.updated_at.desc()))
    return list(result)


@router.get("/materials/{material_id}", response_model=KnowledgeMaterialRead)
def get_material(
    material_id: str,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> KnowledgeMaterial:
    return get_material_or_404(material_id, db, context.workspace_id)


@router.patch("/materials/{material_id}", response_model=KnowledgeMaterialRead)
def update_material(
    material_id: str,
    payload: KnowledgeMaterialUpdate,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> KnowledgeMaterial:
    material = get_material_or_404(material_id, db, context.workspace_id)
    changes = payload.model_dump(exclude_unset=True)

    if "project_id" in changes:
        project_id = changes.pop("project_id")
        if project_id is not None:
            get_project_or_404(project_id, db, context.workspace_id)
        material.project_id = project_id

    if "report_id" in changes:
        material.report_id = validate_report_id(
            changes.pop("report_id"), db, context.workspace_id
        )

    for field, value in changes.items():
        setattr(material, field, value)

    db.add(material)
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.material.update",
        resource_type="knowledge_material",
        resource_id=material.id,
        meta={"changes": list(changes.keys())},
    )
    db.commit()
    db.refresh(material)
    return material


@router.delete("/materials/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    context: CurrentWorkspaceContext = Depends(get_current_workspace_context),
) -> None:
    material = get_material_or_404(material_id, db, context.workspace_id)
    db.execute(
        delete(KnowledgeMaterial).where(KnowledgeMaterial.id == material.id)
    )
    write_audit_log(
        db=db,
        workspace_id=context.workspace_id,
        action="knowledge.material.delete",
        resource_type="knowledge_material",
        resource_id=material.id,
    )
    db.commit()
    return None
