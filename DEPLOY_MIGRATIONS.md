# Как применить миграции к базе данных

## Быстрый способ (рекомендуется)

### Вариант 1: Через Python скрипт

```bash
# Убедитесь, что DATABASE_URL установлен
export DATABASE_URL="postgresql://user:password@host:port/database"

# Применить миграции
python scripts/run_migrations.py
```

### Вариант 2: Через Alembic напрямую

```bash
# Убедитесь, что DATABASE_URL установлен
export DATABASE_URL="postgresql://user:password@host:port/database"

# Применить миграции
alembic upgrade head
```

### Вариант 3: Проверить статус перед применением

```bash
# Проверить текущее состояние
python scripts/check_migrations.py

# Если нужно, применить
python scripts/run_migrations.py
```

## Что будет создано

Миграция `001_add_telegram_chats` создаст:

1. **Новые таблицы:**
   - `tg_chats` - Telegram группы
   - `chat_admins` - связь групп и админов
   - `chat_members` - связь групп и участников

2. **Новые колонки:**
   - `tournaments.chat_id` (nullable)
   - `player_mode_stats.chat_id` (nullable)

3. **Индексы и внешние ключи:**
   - Индексы на `tg_chat_id`, `chat_id`
   - Внешние ключи с каскадным удалением

## Проверка после применения

```bash
# Подключитесь к PostgreSQL
psql $DATABASE_URL

# Проверьте таблицы
\dt

# Должны появиться:
# - tg_chats
# - chat_admins  
# - chat_members

# Проверьте структуру tournaments
\d tournaments
# Должна появиться колонка chat_id

# Проверьте структуру player_mode_stats
\d player_mode_stats
# Должна появиться колонка chat_id
```

## Если возникли ошибки

### Ошибка "Table already exists"
Это значит, что миграция уже применена частично. Можно:
1. Откатить миграцию: `alembic downgrade -1`
2. Применить снова: `alembic upgrade head`

### Ошибка "DATABASE_URL is not set"
Убедитесь, что переменная окружения установлена:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
# Или на Windows:
set DATABASE_URL=postgresql://user:password@host:port/database
```

### Ошибка подключения к БД
Проверьте:
- Правильность DATABASE_URL
- Доступность сервера БД
- Права доступа пользователя

