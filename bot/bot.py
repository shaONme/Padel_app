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
)

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
BACKEND_URL = "http://127.0.0.1:8000"
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://example.com")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set in .env")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Команда /start: регистрируем игрока и даём кнопку открытия WebApp."""
    user = update.effective_user
    if user is None:
        return

    payload = {
        "tg_id": user.id,
        "username": user.username,
        "display_name": (user.full_name or user.username or "Player"),
    }

    # 1) регистрируем/обновляем игрока в backend
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
            # даже если ошибка — всё равно попробуем показать кнопку WebApp

    # 2) кнопка WebApp
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
    """Команда /me: показываем данные игрока из backend."""
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


def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("me", me))

    app.run_polling()


if __name__ == "__main__":
    main()
