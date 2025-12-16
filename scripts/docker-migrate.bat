@echo off
REM Скрипт для применения миграций Alembic в Docker контейнере (Windows)

echo Applying Alembic migrations...

docker-compose exec -T backend alembic upgrade head

if %ERRORLEVEL% EQU 0 (
    echo Migrations applied successfully!
) else (
    echo Error applying migrations!
    exit /b %ERRORLEVEL%
)

