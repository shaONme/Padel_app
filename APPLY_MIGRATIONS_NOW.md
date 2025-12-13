# Применить миграции СЕЙЧАС

## Быстрая инструкция:

### 1. Установите DATABASE_URL

В PowerShell выполните (замените на ваш реальный URL базы данных):

```powershell
$env:DATABASE_URL = "postgresql://user:password@host:port/database"
```

**Пример для Render.com:**
```powershell
$env:DATABASE_URL = "postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/dbname"
```

**Пример для локальной PostgreSQL:**
```powershell
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/padel_db"
```

### 2. Запустите миграции

```powershell
# Убедитесь, что виртуальное окружение активировано
& d:/VSCodePROJ/Padel_app/.venv/Scripts/Activate.ps1

# Запустите скрипт миграций
python scripts/run_migrations.py
```

### 3. Проверьте результат

Должно появиться:
```
✅ Migrations applied successfully!
Current migration version: 001_add_telegram_chats (head)
```

## Что будет создано:

- ✅ Таблица `tg_chats`
- ✅ Таблица `chat_admins`
- ✅ Таблица `chat_members`
- ✅ Колонка `tournaments.chat_id`
- ✅ Колонка `player_mode_stats.chat_id`

## Если возникла ошибка:

1. **"DATABASE_URL is not set"** - установите переменную окружения (см. шаг 1)
2. **"Connection refused"** - проверьте доступность базы данных
3. **"Permission denied"** - проверьте права пользователя БД на создание таблиц

