from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Chat, Message, ModelRun, Project
from app.schemas.chats import ChatCreate, ChatRead, ChatUpdate
from app.services.audit import write_audit_log
from app.services.bootstrap import get_or_create_default_workspace

router = APIRouter(prefix="/chats", tags=["chats"])


def get_project_or_404(project_id: str, db: Session) -> Project:
    project = db.get(Project, project_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.post("", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
def create_chat(payload: ChatCreate, db: Session = Depends(get_db)) -> Chat:
    workspace = get_or_create_default_workspace(db)
    project_id = payload.project_id

    if project_id is not None:
        project = get_project_or_404(project_id, db)
        workspace_id = project.workspace_id
    else:
        workspace_id = workspace.id

    chat = Chat(
        workspace_id=workspace_id,
        project_id=project_id,
        title=payload.title or "Nova conversa",
        mode=payload.mode,
        model_preference=payload.model_preference,
    )

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return chat


@router.get("", response_model=list[ChatRead])
def list_chats(
    project_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[Chat]:
    statement = select(Chat)

    if project_id is not None:
        statement = statement.where(Chat.project_id == project_id)

    result = db.scalars(
        statement.order_by(Chat.updated_at.desc())
    )

    return list(result)


@router.get("/{chat_id}", response_model=ChatRead)
def get_chat(chat_id: str, db: Session = Depends(get_db)) -> Chat:
    chat = db.get(Chat, chat_id)

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    return chat


@router.patch("/{chat_id}", response_model=ChatRead)
def update_chat(
    chat_id: str,
    payload: ChatUpdate,
    db: Session = Depends(get_db),
) -> Chat:
    chat = db.get(Chat, chat_id)

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    changes = payload.model_dump(exclude_unset=True)

    if "project_id" in changes:
        project_id = changes.pop("project_id")

        if project_id is None:
            chat.project_id = None
        else:
            project = get_project_or_404(project_id, db)
            chat.project_id = project.id
            chat.workspace_id = project.workspace_id

    for field, value in changes.items():
        setattr(chat, field, value)

    db.add(chat)
    db.commit()
    db.refresh(chat)

    return chat


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(chat_id: str, db: Session = Depends(get_db)) -> None:
    chat = db.get(Chat, chat_id)

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    workspace_id = chat.workspace_id

    db.execute(delete(ModelRun).where(ModelRun.chat_id == chat_id))
    db.execute(delete(Message).where(Message.chat_id == chat_id))
    db.delete(chat)

    write_audit_log(
        db=db,
        workspace_id=workspace_id,
        action="chat.delete",
        resource_type="chat",
        resource_id=chat_id,
    )

    db.commit()

    return None
