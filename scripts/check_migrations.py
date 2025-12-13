#!/usr/bin/env python3
"""
Скрипт для проверки статуса миграций.
Показывает текущую версию и список применённых миграций.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from alembic.config import Config
from alembic import command

def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set")
        sys.exit(1)
    
    alembic_cfg_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "alembic.ini"
    )
    
    alembic_cfg = Config(alembic_cfg_path)
    alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    
    print("Checking migration status...")
    
    try:
        # Показываем текущую версию
        print("\n=== Current Migration Version ===")
        command.current(alembic_cfg, verbose=True)
        
        # Показываем историю
        print("\n=== Migration History ===")
        command.history(alembic_cfg, verbose=True)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

