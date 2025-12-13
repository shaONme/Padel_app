@echo off
REM Скрипт для применения миграций Alembic (Windows)
REM Используется при деплое backend

if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL is not set
    exit /b 1
)

echo Applying Alembic migrations...
alembic upgrade head

echo Migrations applied successfully!

