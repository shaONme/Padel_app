"""
Модуль для аутентификации и авторизации.
Пока используется упрощённая схема через заголовок X-User-Tg-Id.
В будущем можно заменить на JWT или OAuth.
"""
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import Optional
from .db import get_db
from .models import Player, ChatAdmin, ChatMember, TelegramChat


async def get_current_user(
    x_user_tg_id: Optional[int] = Header(None, alias="X-User-Tg-Id"),
    db: Session = Depends(get_db),
) -> Player:
    """
    Получает текущего пользователя по tg_id из заголовка.
    В продакшене это должно быть через JWT или OAuth.
    """
    if x_user_tg_id is None:
        raise HTTPException(
            status_code=401,
            detail="Требуется аутентификация. Укажите X-User-Tg-Id в заголовке."
        )
    
    player = db.query(Player).filter(Player.tg_id == x_user_tg_id).first()
    if not player:
        raise HTTPException(
            status_code=404,
            detail=f"Игрок с tg_id={x_user_tg_id} не найден. Зарегистрируйтесь через бота."
        )
    
    return player


def check_chat_admin_access(
    chat_id: int,
    user: Player,
    db: Session,
    allow_member: bool = False,
) -> TelegramChat:
    """
    Проверяет, что пользователь является админом (или участником, если allow_member=True) чата.
    Возвращает объект чата или выбрасывает HTTPException.
    """
    # Проверяем, что чат существует
    chat = db.query(TelegramChat).filter(TelegramChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail=f"Чат с id={chat_id} не найден")
    
    # Проверяем права админа
    is_admin = db.query(ChatAdmin).filter(
        ChatAdmin.chat_id == chat_id,
        ChatAdmin.admin_player_id == user.id
    ).first() is not None
    
    if is_admin:
        return chat
    
    # Если разрешено и для участников
    if allow_member:
        is_member = db.query(ChatMember).filter(
            ChatMember.chat_id == chat_id,
            ChatMember.player_id == user.id,
            ChatMember.status == "active"
        ).first() is not None
        
        if is_member:
            return chat
    
    raise HTTPException(
        status_code=403,
        detail=f"У вас нет прав доступа к чату {chat_id}. Требуются права администратора."
    )


def get_user_chats(user: Player, db: Session, admin_only: bool = False) -> list[TelegramChat]:
    """
    Получает список чатов, где пользователь является админом (или участником).
    
    Args:
        user: Текущий пользователь
        db: Сессия БД
        admin_only: Если True, возвращает только чаты, где пользователь админ
    """
    if admin_only:
        # Только чаты, где пользователь админ
        admin_chats = db.query(TelegramChat).join(
            ChatAdmin,
            ChatAdmin.chat_id == TelegramChat.id
        ).filter(
            ChatAdmin.admin_player_id == user.id
        ).order_by(TelegramChat.title).all()
        return admin_chats
    else:
        # Чаты, где пользователь админ или участник
        admin_chat_ids = db.query(ChatAdmin.chat_id).filter(
            ChatAdmin.admin_player_id == user.id
        ).subquery()
        
        member_chat_ids = db.query(ChatMember.chat_id).filter(
            ChatMember.player_id == user.id,
            ChatMember.status == "active"
        ).subquery()
        
        chats = db.query(TelegramChat).filter(
            (TelegramChat.id.in_(admin_chat_ids)) |
            (TelegramChat.id.in_(member_chat_ids))
        ).order_by(TelegramChat.title).all()
        
        return chats


async def get_chat_id_from_request(
    chat_id: Optional[int] = None,
    x_chat_id: Optional[int] = Header(None, alias="X-Chat-Id"),
) -> int:
    """
    Получает chat_id из query параметра или заголовка.
    """
    result = chat_id or x_chat_id
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="Требуется указать chat_id через query параметр ?chat_id= или заголовок X-Chat-Id"
        )
    return result

