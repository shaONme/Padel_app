import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)

# 1) пробуем взять DATABASE_URL из переменных окружения
database_url = os.getenv("DATABASE_URL")

# 2) если нет – используем SQLite (подходит для Render / тестов)
if not database_url:
    sqlite_path = BASE_DIR / "padel_app.db"
    database_url = f"sqlite:///{sqlite_path}"

# Для SQLite нужно специальный параметр
connect_args = {}
if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
