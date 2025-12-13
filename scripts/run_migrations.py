#!/usr/bin/env python3
"""
Скрипт для применения миграций Alembic.
Можно запустить напрямую или использовать как модуль.
"""
import os
import sys

# Добавляем корневую директорию в путь
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

# Загружаем переменные окружения из .env файла
try:
    from dotenv import load_dotenv
    env_path = os.path.join(project_root, ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"Loaded .env file from: {env_path}")
    else:
        # Пытаемся найти .env в родительской директории
        parent_env = os.path.join(project_root, ".env")
        if os.path.exists(parent_env):
            load_dotenv(parent_env)
except ImportError:
    # python-dotenv не установлен, продолжаем без него
    pass

try:
    from alembic.config import Config
    from alembic import command
except ImportError:
    print("ERROR: Alembic is not installed.")
    print("Please install dependencies:")
    print("  pip install -r requirements.txt")
    sys.exit(1)

def main():
    # Проверяем DATABASE_URL (теперь загружен из .env если файл существует)
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
    # Показываем URL без пароля
    try:
        url_parts = database_url.split('@')
        if len(url_parts) > 1:
            print(f"Database URL: {url_parts[0]}@***/{url_parts[1].split('/')[-1]}")
        else:
            print(f"Database URL: ***")
    except:
        print("Database URL: ***")
    
    try:
        # Проверяем подключение перед применением миграций
        from sqlalchemy import create_engine, text
        print("\nTesting database connection...")
        test_engine = create_engine(database_url)
        with test_engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("✅ Database connection successful!")
        test_engine.dispose()
        
        print("\nApplying Alembic migrations...")
        # Применяем все миграции до head
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations applied successfully!")
        
        # Показываем текущую версию
        print("\nChecking migration status...")
        current = command.current(alembic_cfg, verbose=True)
        
    except Exception as e:
        error_msg = str(e)
        print(f"\n❌ Error: {error_msg}\n")
        
        # Полезные подсказки в зависимости от типа ошибки
        if "could not translate host name" in error_msg or "Name or service not known" in error_msg:
            print("💡 DNS Resolution Error:")
            print("   - Check your internet connection")
            print("   - Verify the database hostname is correct")
            print("   - For Render.com, the hostname should end with '.render.com'")
            print("   - Example: dpg-xxxxx-a.oregon-postgres.render.com")
            print("   - Try pinging the hostname to verify it resolves")
        elif "password authentication failed" in error_msg:
            print("💡 Authentication Error:")
            print("   - Check your DATABASE_URL username and password")
        elif "could not connect to server" in error_msg:
            print("💡 Connection Error:")
            print("   - Check if the database server is running")
            print("   - Verify the host and port are correct")
            print("   - Check firewall settings")
        elif "database" in error_msg.lower() and "does not exist" in error_msg.lower():
            print("💡 Database Error:")
            print("   - The database does not exist")
            print("   - Create it first or check the database name in DATABASE_URL")
        
        print("\nFull error details:")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

