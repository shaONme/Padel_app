# Базовый образ с Python
FROM python:3.12-slim

# Чтобы логи сразу шли в stdout
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория
WORKDIR /app

# Копируем requirements.txt из корня проекта
COPY requirements.txt .

# Устанавливаем Python-зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь проект (нужны backend, alembic и alembic.ini)
COPY backend ./backend
COPY alembic ./alembic
COPY alembic.ini .

# Expose порт
EXPOSE 8000

# Команда запуска FastAPI через uvicorn
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

