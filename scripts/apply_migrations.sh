#!/bin/bash
# Скрипт для применения миграций Alembic
# Используется при деплое backend

set -e

echo "Applying Alembic migrations..."

# Проверяем, что DATABASE_URL установлен
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set"
    exit 1
fi

# Применяем миграции
alembic upgrade head

echo "Migrations applied successfully!"

