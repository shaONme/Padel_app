import os
import logging

from dotenv import load_dotenv
import httpx
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
    ChatMemberHandler,
    MessageHandler,
    filters,
)
from telegram import ChatMember as TgChatMember

# локально подхватит .env, на Render переменные возьмутся из окружения
load_dotenv()



BOT_TOKEN = os.getenv("BOT_TOKEN")

# 🔹 BACKEND_URL из env, локально по умолчанию — 127.0.0.1
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")

# 🔹 URL твоего web-приложения (React/Next/что угодно)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://example.com")

print(">>> BACKEND_URL =", BACKEND_URL)

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in environment variables")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user is None:
        return

    payload = {
        "tg_id": user.id,
        "username": user.username,
        "display_name": (user.full_name or user.username or "Player"),
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{BACKEND_URL}/players/register", json=payload)
            resp.raise_for_status()
            data = resp.json()
            text = (
                f"Привет, {data['display_name']}!\n"
                f"Ты зарегистрирован в системе падела.\n"
                f"Текущий рейтинг: {data['current_rating']:.0f}\n\n"
                f"Нажми кнопку ниже, чтобы открыть приложение."
            )
        except Exception:
            logger.exception("Error registering player")
            text = "Ошибка при регистрации игрока. Попробуй позже."

    keyboard = [
        [
            InlineKeyboardButton(
                text="Открыть приложение",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup)


async def me(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    if user is None:
        return

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BACKEND_URL}/players/by_tg/{user.id}")
            if resp.status_code == 404:
                if update.message:
                    await update.message.reply_text(
                        "Ты ещё не зарегистрирован. Нажми /start."
                    )
                return

            resp.raise_for_status()
            data = resp.json()
            text = (
                f"Игрок: {data['display_name']}\n"
                f"Username: @{data['username']}\n"
                f"Рейтинг: {data['current_rating']:.0f}"
            )
        except Exception:
            logger.exception("Error getting player info")
            text = "Ошибка при получении данных. Попробуй позже."

    if update.message:
        await update.message.reply_text(text)


async def handle_my_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обрабатывает событие добавления/удаления бота из группы.
    """
    if update.my_chat_member is None:
        return
    
    chat = update.my_chat_member.chat
    new_status = update.my_chat_member.new_chat_member.status
    
    # Регистрируем чат при добавлении бота
    if new_status in ("member", "administrator"):
        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "tg_chat_id": chat.id,
                    "title": chat.title,
                    "type": chat.type,
                }
                resp = await client.post(
                    f"{BACKEND_URL}/bot/chats/register",
                    json=payload,
                    timeout=10.0
                )
                resp.raise_for_status()
                logger.info(f"Chat {chat.id} ({chat.title}) registered")
            except Exception:
                logger.exception(f"Error registering chat {chat.id}")
    
    # При удалении бота можно пометить чат как неактивный (опционально)


async def handle_new_chat_members(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обрабатывает событие добавления новых участников в группу.
    """
    if update.message is None or update.message.new_chat_members is None:
        return
    
    chat = update.message.chat
    members = update.message.new_chat_members
    
    async with httpx.AsyncClient() as client:
        for member in members:
            try:
                # Игнорируем ботов (кроме самого себя, если нужно)
                if member.is_bot and member.id != context.bot.id:
                    continue
                
                payload = {
                    "tg_chat_id": chat.id,
                    "tg_user_id": member.id,
                    "username": member.username,
                    "display_name": member.full_name or member.username or f"User {member.id}",
                    "status": "active",
                }
                
                resp = await client.post(
                    f"{BACKEND_URL}/bot/chats/members/update",
                    json=payload,
                    timeout=10.0
                )
                resp.raise_for_status()
                logger.info(f"Member {member.id} added to chat {chat.id}")
            except Exception:
                logger.exception(f"Error updating member {member.id} in chat {chat.id}")


async def handle_left_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Обрабатывает событие ухода участника из группы.
    """
    if update.message is None or update.message.left_chat_member is None:
        return
    
    chat = update.message.chat
    member = update.message.left_chat_member
    
    async with httpx.AsyncClient() as client:
        try:
            payload = {
                "tg_chat_id": chat.id,
                "tg_user_id": member.id,
                "status": "left",
            }
            
            resp = await client.post(
                f"{BACKEND_URL}/bot/chats/members/update",
                json=payload,
                timeout=10.0
            )
            resp.raise_for_status()
            logger.info(f"Member {member.id} left chat {chat.id}")
        except Exception:
            logger.exception(f"Error updating member {member.id} in chat {chat.id}")


async def sync_members(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Команда /sync для синхронизации участников группы.
    Может быть использована только админом группы.
    """
    if update.message is None:
        return
    
    chat = update.message.chat
    user = update.effective_user
    
    # Проверяем, что команда вызвана в группе
    if chat.type not in ("group", "supergroup"):
        await update.message.reply_text("Эта команда работает только в группах.")
        return
    
    # Проверяем права админа (опционально, можно убрать для простоты)
    try:
        member = await context.bot.get_chat_member(chat.id, user.id)
        if member.status not in ("administrator", "creator"):
            await update.message.reply_text("Только администраторы могут использовать эту команду.")
            return
    except Exception:
        logger.exception("Error checking admin status")
        # Продолжаем выполнение, если не удалось проверить
    
    await update.message.reply_text("Синхронизирую участников...")
    
    async with httpx.AsyncClient() as client:
        try:
            # Получаем список админов
            admins = []
            try:
                chat_admins = await context.bot.get_chat_administrators(chat.id)
                admin_ids = {admin.user.id for admin in chat_admins}
            except Exception:
                logger.warning("Could not get chat administrators")
                admin_ids = set()
            
            # Получаем список участников
            # В больших группах Telegram API не позволяет получить всех участников напрямую
            # Поэтому используем только админов и полагаемся на события new_chat_members для остальных
            members_data = []
            try:
                # Получаем список админов (это точно работает)
                chat_admins = await context.bot.get_chat_administrators(chat.id)
                admin_ids = {admin.user.id for admin in chat_admins}
                
                for admin in chat_admins:
                    if admin.user.is_bot and admin.user.id != context.bot.id:
                        continue
                    members_data.append({
                        "tg_id": admin.user.id,
                        "username": admin.user.username,
                        "display_name": admin.user.full_name or admin.user.username or f"User {admin.user.id}",
                        "is_admin": True,
                    })
                
                logger.info(f"Found {len(members_data)} admins in chat {chat.id}")
            except Exception:
                logger.warning("Could not get chat administrators")
                admin_ids = set()
            
            if not members_data:
                await update.message.reply_text("Не удалось получить список участников.")
                return
            
            payload = {
                "tg_chat_id": chat.id,
                "members": members_data,
            }
            
            resp = await client.post(
                f"{BACKEND_URL}/bot/chats/members/sync",
                json=payload,
                timeout=30.0
            )
            resp.raise_for_status()
            data = resp.json()
            
            await update.message.reply_text(
                f"Синхронизация завершена!\n"
                f"Обработано участников: {data['members_processed']}\n"
                f"Создано новых игроков: {data['players_created']}\n"
                f"Обновлено игроков: {data['players_updated']}"
            )
        except Exception:
            logger.exception("Error syncing members")
            await update.message.reply_text("Ошибка при синхронизации участников.")


def main():
    application = ApplicationBuilder().token(BOT_TOKEN).build()

    # Команды
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    application.add_handler(CommandHandler("sync", sync_members))

    # Обработчики событий группы
    application.add_handler(ChatMemberHandler(handle_my_chat_member, ChatMemberHandler.MY_CHAT_MEMBER))
    application.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, handle_new_chat_members))
    application.add_handler(MessageHandler(filters.StatusUpdate.LEFT_CHAT_MEMBER, handle_left_chat_member))

    application.run_polling()  # для Render это ок


if __name__ == "__main__":
    main()
