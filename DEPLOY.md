# Инструкция по деплою

## Деплой фронтенда

### Netlify

1. Подключите репозиторий к Netlify
2. Настройки сборки:
   - **Build command:** `cd web && npm install && npm run build:prod`
   - **Publish directory:** `web/dist`
3. Переменные окружения (Environment variables):
   - `VITE_API_URL` = `https://padel-app-go6s.onrender.com` (или ваш продакшн API URL)

### Vercel

1. Подключите репозиторий к Vercel
2. Настройки проекта:
   - **Root Directory:** `web`
   - **Build Command:** `npm run build:prod`
   - **Output Directory:** `dist`
3. Переменные окружения:
   - `VITE_API_URL` = `https://padel-app-go6s.onrender.com`

### GitHub Pages / Другие статические хостинги

1. Соберите проект:
   ```bash
   cd web
   npm run build:prod
   ```
2. Загрузите содержимое папки `web/dist` на хостинг
3. Убедитесь, что переменная `VITE_API_URL` установлена в продакшн URL

## Деплой бэкенда

### Render.com

1. Подключите репозиторий
2. Настройки:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
3. Переменные окружения:
   - `DATABASE_URL` - URL вашей PostgreSQL базы данных
   - `PYTHON_VERSION` = `3.12` (или ваша версия)

### Другие платформы

Аналогично настройте переменные окружения и команды запуска.

## Проверка после деплоя

1. Откройте приложение в браузере
2. Откройте консоль разработчика (F12)
3. Проверьте, что API запросы идут на правильный URL:
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```
4. Проверьте, что нет ошибок CORS в консоли

## Обновление CORS на бэкенде

Если деплоите на новый домен, обновите список разрешенных origins в `backend/main.py`:

```python
origins = [
    "https://paddleapp.netlify.app",
    "http://localhost:5173",
    "https://your-new-domain.com",  # Добавьте ваш новый домен
]
```

