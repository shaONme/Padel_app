# Настройка переменных окружения

## Структура файлов .env

Vite автоматически загружает файлы окружения в следующем порядке приоритета:

1. `.env.[mode].local` - локальные переопределения для конкретного режима (игнорируется git)
2. `.env.[mode]` - переменные для конкретного режима
3. `.env.local` - локальные переопределения (игнорируется git)
4. `.env` - общие переменные

## Для локальной разработки

Создайте файл `web/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

**Примечание:** `.env.local` уже в `.gitignore`, поэтому не попадет в репозиторий.

## Для продакшн сборки

Создайте файл `web/.env.production`:

```env
VITE_API_URL=https://padel-app-go6s.onrender.com
```

Или установите переменную окружения на сервере деплоя (Netlify, Vercel и т.д.).

## Автоматический fallback

Если `VITE_API_URL` не задан:
- В режиме разработки (`npm run dev`) → используется `http://localhost:8000`
- В продакшн режиме → используется `https://padel-app-go6s.onrender.com`

## Быстрое переключение

### Локальная разработка:
```bash
cd web
# Использует .env.local или fallback на localhost:8000
npm run dev
```

### Продакшн сборка:
```bash
cd web
# Использует .env.production или переменные окружения сервера
npm run build:prod
```

## Проверка текущего API URL

В консоли браузера (F12) выполните:
```javascript
console.log(import.meta.env.VITE_API_URL)
```

