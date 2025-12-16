# Сборка React приложения
FROM node:20-alpine

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем исходный код
COPY . .

# Создаем .env файл с правильным API URL для продакшена
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# Собираем приложение
RUN npm run build

# Копируем собранные файлы в volume (будет доступен для nginx)
# Этот контейнер будет запущен как init контейнер
CMD ["sh", "-c", "cp -r /app/dist/* /usr/share/nginx/html/ && tail -f /dev/null"]

