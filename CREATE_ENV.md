# Создание .env файла

## Быстрая инструкция:

### 1. Создайте файл `.env` в корне проекта

Скопируйте содержимое из `env.example` и замените значения на свои:

```bash
# Windows PowerShell
Copy-Item env.example .env

# Или создайте вручную файл .env со следующим содержимым:
```

### 2. Отредактируйте .env файл

Откройте `.env` и укажите ваш реальный `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@host:port/database
```

**Пример для Render.com:**
```env
DATABASE_URL=postgresql://user:pass@dpg-xxxxx-a.oregon-postgres.render.com/dbname
```

**Пример для локальной PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/padel_db
```

### 3. Теперь скрипт миграций автоматически загрузит DATABASE_URL из .env

Просто запустите:
```powershell
python scripts/run_migrations.py
```

## Важно:

- Файл `.env` уже в `.gitignore`, так что он не попадёт в git (безопасно хранить пароли)
- Не коммитьте реальный `.env` файл с паролями!
- Используйте `env.example` как шаблон для команды

