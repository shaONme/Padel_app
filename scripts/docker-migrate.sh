#!/bin/bash
# Скрипт для применения миграций Alembic в Docker контейнере

set -e

echo "Applying Alembic migrations..."

# Запускаем миграции в контейнере backend
docker-compose exec -T backend alembic upgrade head

echo "Migrations applied successfully!"

