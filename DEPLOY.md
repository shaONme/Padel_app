# Инструкция по деплою

## Подготовка базы данных

### Вариант 1: Автоматическое создание через Alembic (рекомендуется)

Таблицы создаются автоматически при применении миграций. **Ничего создавать вручную не нужно!**

```bash
# При деплое backend выполните:
alembic upgrade head
```

### Вариант 2: Если миграции не применяются автоматически

Если у вас уже есть база данных с таблицами `players`, `tournaments` и т.д., миграция добавит новые таблицы:
- `tg_chats`
- `chat_admins`
- `chat_members`

И добавит колонки:
- `tournaments.chat_id` (nullable для обратной совместимости)
- `player_mode_stats.chat_id` (nullable)

## Деплой Backend

1. **Установите зависимости:**
```bash
pip install -r requirements.txt
```

2. **Примените миграции:**
```bash
# Linux/Mac
bash scripts/apply_migrations.sh

# Windows
scripts\apply_migrations.bat

# Или напрямую:
alembic upgrade head
```

3. **Запустите сервер:**
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

## Деплой Bot (Docker)

1. **Убедитесь, что в `.env` файле есть:**
```env
BOT_TOKEN=your_bot_token
BACKEND_URL=https://your-backend-url.com
WEBAPP_URL=https://your-webapp-url.com
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

2. **Соберите и запустите:**
```bash
cd bot
docker-compose up -d --build
```

3. **Проверьте логи:**
```bash
docker logs -f padel_bot
```

## Деплой Frontend

1. **Установите зависимости:**
```bash
cd web
npm install
```

2. **Соберите для продакшена:**
```bash
npm run build
```

3. **Настройте переменные окружения:**
Создайте `.env.production`:
```
VITE_API_URL=https://your-backend-url.com
```

4. **Деплой на хостинг** (Netlify, Vercel, etc.)

## Проверка после деплоя

1. **Проверьте health endpoint:**
```bash
curl https://your-backend-url.com/health
```

2. **Проверьте, что бот отвечает:**
   - Добавьте бота в тестовую группу
   - Выполните `/start` в личке с ботом
   - Проверьте, что бот отвечает

3. **Проверьте веб-приложение:**
   - Откройте веб-приложение
   - Убедитесь, что можно выбрать группу
   - Попробуйте создать турнир

## Важные замечания

1. **Миграции применяются один раз** - при первом деплое. При последующих деплоях они проверят, что всё актуально.

2. **Если миграция уже применена**, Alembic не будет пытаться создать таблицы заново.

3. **Обратная совместимость**: Старые турниры могут иметь `chat_id = NULL`. Это нормально, они будут работать, но не будут привязаны к группе.

4. **Проверка миграций:**
```bash
# Посмотреть текущую версию
alembic current

# Посмотреть историю миграций
alembic history
```

