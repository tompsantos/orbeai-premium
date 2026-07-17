from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import ModelRun
from app.schemas.model_runs import ModelRunRead

router = APIRouter(prefix="/model-runs", tags=["model-runs"])


@router.get("", response_model=list[ModelRunRead])
def list_model_runs(
    chat_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[ModelRun]:
    statement = select(ModelRun)

    if chat_id is not None:
        statement = statement.where(ModelRun.chat_id == chat_id)

    result = db.scalars(
        statement.order_by(ModelRun.created_at.desc()).limit(limit)
    )

    return list(result)


@router.get("/{model_run_id}", response_model=ModelRunRead)
def get_model_run(
    model_run_id: str,
    db: Session = Depends(get_db),
) -> ModelRun:
    model_run = db.get(ModelRun, model_run_id)

    if model_run is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model run not found",
        )

    return model_run
