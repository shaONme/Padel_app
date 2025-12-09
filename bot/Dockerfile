# Базовый образ с Python
FROM python:3.12-slim

# Чтобы логи сразу шли в stdout и pip не кешировал
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# При необходимости ставим системные либы (для httpx/ssl обычно хватает базовых)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Рабочая директория внутри контейнера
WORKDIR /app

# Копируем только зависимости
COPY requirements.txt .

# Устанавливаем Python-зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем ВСЁ остальное (код бота и .env — если не в .dockerignore)
COPY . .

# Команда запуска бота
CMD ["python", "bot.py"]
