# Деплой на VPS с Docker + Nginx

## Требования

- VPS с установленными Docker и Docker Compose
- Домен (опционально, но рекомендуется)
- Git

## Быстрый старт

1. **Клонируйте репозиторий на VPS:**
   ```bash
   git clone <your-repo-url>
   cd Padel_app
   ```

2. **Веб-приложение собирается автоматически в Docker.** 
   
   ⚠️ **Важно:** Ручная сборка больше не требуется - Docker сделает это автоматически при сборке образа.

3. **Создайте файл `.env` на основе `env.example` (ОБЯЗАТЕЛЬНО!):**
   ```bash
   cp env.example .env
   nano .env  # или используйте любой редактор (vi, vim, etc)
   ```
   
   ⚠️ **ВАЖНО:** Без файла `.env` контейнеры не запустятся!

4. **Настройте переменные окружения в `.env`:**
   
   **Обязательные переменные:**
   - `DATABASE_URL` - полный URL вашей базы данных PostgreSQL (например, для Render):
     ```
     DATABASE_URL=postgresql://user:password@host:5432/dbname
     ```
   - `BOT_TOKEN` - токен вашего Telegram бота
   - `CORS_ORIGINS` - домены, с которых будут приниматься запросы (через запятую), например: 
     - Для Cloudflare Tunnel: `https://administered-martin-taxi-disc.trycloudflare.com`
     - Для постоянного домена: `http://yourdomain.com,https://yourdomain.com`
   - `WEBAPP_URL` - URL вашего веб-приложения (для кнопки WebApp в боте), например: 
     - Для Cloudflare Tunnel: `https://administered-martin-taxi-disc.trycloudflare.com`
     - Для постоянного домена: `https://yourdomain.com`
   - `BACKEND_URL` - оставьте `http://backend:8000` для Docker (внутреннее взаимодействие)

5. **Соберите и запустите контейнеры:**
   ```bash
   docker-compose up -d --build
   ```

6. **Примените миграции базы данных:**
   ```bash
   # Linux/Mac
   ./scripts/docker-migrate.sh
   
   # Windows
   scripts\docker-migrate.bat
   ```

7. **Проверьте статус контейнеров:**
   ```bash
   docker-compose ps
   ```

8. **Проверьте логи:**
   ```bash
   docker-compose logs -f
   ```

## Структура сервисов

- **nginx** (порт 80/443) - статические файлы и reverse proxy для API
- **backend** (внутренний порт 8000) - FastAPI приложение
- **bot** - Telegram бот
- **postgres** (внутренний порт 5432) - PostgreSQL база данных

## Доступ к приложению

- **Веб-приложение**: `http://your-vps-ip` или `https://yourdomain.com`
- **API**: `http://your-vps-ip/api/` или `https://yourdomain.com/api/`
- **Health check**: `http://your-vps-ip/health`

## Обновление приложения

1. Получите последние изменения:
   ```bash
   git pull
   ```

2. Пересоберите и перезапустите контейнеры (веб-приложение пересоберется автоматически):
   ```bash
   docker-compose up -d --build
   ```

4. Если были изменения в миграциях:
   ```bash
   # Linux/Mac
   ./scripts/docker-migrate.sh
   
   # Windows
   scripts\docker-migrate.bat
   ```

## Настройка SSL (HTTPS)

### Вариант 1: Cloudflare Tunnel (рекомендуется для быстрого старта)

Cloudflare Tunnel позволяет получить HTTPS домен без настройки SSL сертификатов:

1. Установите `cloudflared` на ваш компьютер или сервер
2. Запустите туннель:
   ```bash
   cloudflared tunnel --url http://localhost:80
   ```
3. Получите домен вида `https://xxxxx.trycloudflare.com`
4. Обновите в `.env`:
   - `CORS_ORIGINS` - добавьте ваш Cloudflare домен
   - `WEBAPP_URL` - укажите ваш Cloudflare домен

### Вариант 2: Let's Encrypt с Certbot

Для постоянного домена рекомендуется использовать Certbot с Let's Encrypt:

1. Установите Certbot:
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. Получите сертификат:
   ```bash
   sudo certbot --nginx -d yourdomain.com
   ```

3. Certbot автоматически настроит Nginx. Затем обновите `docker-compose.yml` чтобы пробросить порт 443.

## Резервное копирование базы данных

```bash
# Создание бэкапа
docker-compose exec -T postgres pg_dump -U postgres padel_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
docker-compose exec -T postgres psql -U postgres padel_db < backup.sql
```

## Мониторинг логов

```bash
# Все логи
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f bot
docker-compose logs -f nginx
```

## Остановка и запуск

```bash
# Остановить все сервисы
docker-compose down

# Запустить все сервисы
docker-compose up -d

# Остановить и удалить volumes (ОСТОРОЖНО: удалит базу данных!)
docker-compose down -v
```

### Если получаете ошибку "container name already in use"

Если при запуске получаете ошибку, что контейнер уже существует:

```bash
# Остановите и удалите все контейнеры проекта
docker-compose down

# Или принудительно остановите и удалите все контейнеры
docker-compose down --remove-orphans

# Затем запустите заново
docker-compose up -d --build
```

## Переменные окружения

Основные переменные в `.env`:

**Обязательные:**
- `DATABASE_URL` - полный URL базы данных PostgreSQL (например: `postgresql://user:password@host:5432/dbname`)
- `BOT_TOKEN` - токен Telegram бота
- `WEBAPP_URL` - URL веб-приложения
- `CORS_ORIGINS` - разрешенные CORS origins (через запятую)

**Опциональные:**
- `BACKEND_URL` - URL backend API (внутри Docker: `http://backend:8000`, по умолчанию используется это значение)
- `NGINX_HTTP_PORT` - HTTP порт Nginx (по умолчанию 80)
- `NGINX_HTTPS_PORT` - HTTPS порт Nginx (по умолчанию 443)

**Для локальной БД (если используете postgres сервис в docker-compose.yml):**
- `POSTGRES_USER` - пользователь PostgreSQL
- `POSTGRES_PASSWORD` - пароль PostgreSQL
- `POSTGRES_DB` - имя базы данных
- `POSTGRES_PORT` - порт PostgreSQL

## Troubleshooting

### Backend не запускается
```bash
docker-compose logs backend
# Проверьте DATABASE_URL и другие переменные окружения
```

### Bot не работает
```bash
docker-compose logs bot
# Проверьте BOT_TOKEN и BACKEND_URL
```

### Nginx выдает 502 Bad Gateway
- Убедитесь, что backend контейнер запущен: `docker-compose ps`
- Проверьте логи backend: `docker-compose logs backend`

### Миграции не применяются
```bash
# Запустите миграции вручную
docker-compose exec backend alembic upgrade head
```

