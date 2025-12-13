#!/usr/bin/env python3
"""
Скрипт для применения миграций Alembic.
Можно запустить напрямую или использовать как модуль.
"""
import os
import sys

# Добавляем корневую директорию в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic.config import Config
from alembic import command

def main():
    # Проверяем DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set")
        print("Please set DATABASE_URL before running migrations")
        sys.exit(1)
    
    # Путь к alembic.ini относительно этого скрипта
    alembic_cfg_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "alembic.ini"
    )
    
    alembic_cfg = Config(alembic_cfg_path)
    
    # Переопределяем sqlalchemy.url из окружения
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    
    print("Applying Alembic migrations...")
    print(f"Database URL: {database_url.split('@')[0]}@***")  # Не показываем пароль
    
    try:
        # Применяем все миграции до head
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations applied successfully!")
        
        # Показываем текущую версию
        current = command.current(alembic_cfg)
        print(f"Current migration version: {current}")
        
    except Exception as e:
        print(f"❌ Error applying migrations: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

