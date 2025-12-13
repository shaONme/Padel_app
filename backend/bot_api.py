"""
API эндпоинты для Telegram бота.
Эти эндпоинты используются ботом для регистрации чатов и синхронизации участников.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

from .db import get_db
from .models import (
    Player,
    TelegramChat,
    ChatAdmin,
    ChatMember,
)

router = APIRouter(prefix="/bot", tags=["bot"])


class ChatRegisterRequest(BaseModel):
    tg_chat_id: int
    title: Optional[str] = None
    type: Optional[str] = None  # group, supergroup, channel


class ChatRegisterResponse(BaseModel):
    id: int
    tg_chat_id: int
    title: Optional[str]
    type: Optional[str]
    created: bool


class MemberSyncRequest(BaseModel):
    tg_chat_id: int
    members: List[dict]  # [{"tg_id": int, "username": str|null, "display_name": str, "is_admin": bool}]


class MemberUpdateRequest(BaseModel):
    tg_chat_id: int
    tg_user_id: int
    username: Optional[str] = None
    display_name: Optional[str] = None
    status: Optional[str] = None  # active, left, kicked
    is_admin: Optional[bool] = None


@router.post("/chats/register", response_model=ChatRegisterResponse)
def register_chat(
    data: ChatRegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Регистрирует или обновляет информацию о Telegram чате.
    Вызывается ботом при добавлении его в группу.
    """
    chat = db.query(TelegramChat).filter(
        TelegramChat.tg_chat_id == data.tg_chat_id
    ).first()
    
    created = False
    if not chat:
        chat = TelegramChat(
            tg_chat_id=data.tg_chat_id,
            title=data.title,
            type=data.type,
        )
        db.add(chat)
        db.flush()
        created = True
    else:
        # Обновляем информацию
        if data.title:
            chat.title = data.title
        if data.type:
            chat.type = data.type
        chat.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(chat)
    
    return ChatRegisterResponse(
        id=chat.id,
        tg_chat_id=chat.tg_chat_id,
        title=chat.title,
        type=chat.type,
        created=created,
    )


@router.post("/chats/members/sync")
def sync_chat_members(
    data: MemberSyncRequest,
    db: Session = Depends(get_db),
):
    """
    Синхронизирует список участников чата.
    Вызывается ботом при команде /sync или автоматически при событиях.
    """
    # Находим чат
    chat = db.query(TelegramChat).filter(
        TelegramChat.tg_chat_id == data.tg_chat_id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=404,
            detail=f"Чат с tg_chat_id={data.tg_chat_id} не найден. Сначала зарегистрируйте чат."
        )
    
    updated_count = 0
    created_count = 0
    
    for member_data in data.members:
        tg_id = member_data.get("tg_id")
        if not tg_id:
            continue
        
        # Создаём или обновляем игрока
        player = db.query(Player).filter(Player.tg_id == tg_id).first()
        if not player:
            player = Player(
                tg_id=tg_id,
                username=member_data.get("username"),
                display_name=member_data.get("display_name", f"User {tg_id}"),
            )
            db.add(player)
            db.flush()
            created_count += 1
        else:
            # Обновляем данные игрока
            if "username" in member_data:
                player.username = member_data["username"]
            if "display_name" in member_data:
                player.display_name = member_data["display_name"]
            updated_count += 1
        
        # Добавляем/обновляем запись участника чата
        chat_member = db.query(ChatMember).filter(
            ChatMember.chat_id == chat.id,
            ChatMember.player_id == player.id
        ).first()
        
        if not chat_member:
            chat_member = ChatMember(
                chat_id=chat.id,
                player_id=player.id,
                status="active",
            )
            db.add(chat_member)
        else:
            chat_member.status = "active"
            chat_member.updated_at = datetime.now(timezone.utc)
        
        # Обновляем админов
        is_admin = member_data.get("is_admin", False)
        if is_admin:
            admin = db.query(ChatAdmin).filter(
                ChatAdmin.chat_id == chat.id,
                ChatAdmin.admin_player_id == player.id
            ).first()
            
            if not admin:
                admin = ChatAdmin(
                    chat_id=chat.id,
                    admin_player_id=player.id,
                    role="admin",  # Можно улучшить, определяя owner
                )
                db.add(admin)
        else:
            # Убираем из админов, если больше не админ
            admin = db.query(ChatAdmin).filter(
                ChatAdmin.chat_id == chat.id,
                ChatAdmin.admin_player_id == player.id
            ).first()
            if admin:
                db.delete(admin)
    
    db.commit()
    
    return {
        "status": "success",
        "chat_id": chat.id,
        "members_processed": len(data.members),
        "players_created": created_count,
        "players_updated": updated_count,
    }


@router.post("/chats/members/update")
def update_chat_member(
    data: MemberUpdateRequest,
    db: Session = Depends(get_db),
):
    """
    Обновляет информацию об одном участнике чата.
    Используется при событиях new_chat_members, left_chat_member и т.д.
    """
    # Находим чат
    chat = db.query(TelegramChat).filter(
        TelegramChat.tg_chat_id == data.tg_chat_id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=404,
            detail=f"Чат с tg_chat_id={data.tg_chat_id} не найден"
        )
    
    # Находим или создаём игрока
    player = db.query(Player).filter(Player.tg_id == data.tg_user_id).first()
    if not player:
        player = Player(
            tg_id=data.tg_user_id,
            username=data.username,
            display_name=data.display_name or f"User {data.tg_user_id}",
        )
        db.add(player)
        db.flush()
    else:
        if data.username is not None:
            player.username = data.username
        if data.display_name:
            player.display_name = data.display_name
    
    # Обновляем участника чата
    chat_member = db.query(ChatMember).filter(
        ChatMember.chat_id == chat.id,
        ChatMember.player_id == player.id
    ).first()
    
    if data.status == "left" or data.status == "kicked":
        if chat_member:
            chat_member.status = data.status
            chat_member.updated_at = datetime.now(timezone.utc)
    else:
        if not chat_member:
            chat_member = ChatMember(
                chat_id=chat.id,
                player_id=player.id,
                status=data.status or "active",
            )
            db.add(chat_member)
        else:
            chat_member.status = data.status or "active"
            chat_member.updated_at = datetime.now(timezone.utc)
    
    # Обновляем админа, если указано
    if data.is_admin is not None:
        if data.is_admin:
            admin = db.query(ChatAdmin).filter(
                ChatAdmin.chat_id == chat.id,
                ChatAdmin.admin_player_id == player.id
            ).first()
            if not admin:
                admin = ChatAdmin(
                    chat_id=chat.id,
                    admin_player_id=player.id,
                    role="admin",
                )
                db.add(admin)
        else:
            admin = db.query(ChatAdmin).filter(
                ChatAdmin.chat_id == chat.id,
                ChatAdmin.admin_player_id == player.id
            ).first()
            if admin:
                db.delete(admin)
    
    db.commit()
    
    return {
        "status": "success",
        "chat_id": chat.id,
        "player_id": player.id,
    }

