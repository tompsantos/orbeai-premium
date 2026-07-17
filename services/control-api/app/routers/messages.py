from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Chat, Message
from app.models.core import utc_now
from app.schemas.messages import MessageCreate, MessageRead

router = APIRouter(tags=["messages"])


def get_chat_or_404(chat_id: str, db: Session) -> Chat:
    chat = db.get(Chat, chat_id)

    if chat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    return chat


@router.post(
    "/chats/{chat_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_message(
    chat_id: str,
    payload: MessageCreate,
    db: Session = Depends(get_db),
) -> Message:
    chat = get_chat_or_404(chat_id, db)

    message = Message(
        chat_id=chat.id,
        role=payload.role,
        content=payload.content,
        provider=payload.provider,
        model=payload.model,
        input_tokens=payload.input_tokens,
        output_tokens=payload.output_tokens,
        meta=payload.meta,
    )

    chat.updated_at = utc_now()

    db.add(message)
    db.add(chat)
    db.commit()
    db.refresh(message)

    return message


@router.get("/chats/{chat_id}/messages", response_model=list[MessageRead])
def list_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
) -> list[Message]:
    get_chat_or_404(chat_id, db)

    result = db.scalars(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.created_at.asc())
    )

    return list(result)


@router.get("/messages/{message_id}", response_model=MessageRead)
def get_message(
    message_id: str,
    db: Session = Depends(get_db),
) -> Message:
    message = db.get(Message, message_id)

    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return message
