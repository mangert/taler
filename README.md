# Taler

Taler — полнофункциональное приложение для учёта личных финансов. Проект состоит из NestJS API, React-интерфейса и PostgreSQL.

## Запуск через Docker Compose

Требуется Docker Desktop с поддержкой Compose. Из корня репозитория выполните:

```bash
docker compose up --build
```

Одна команда применяет Prisma-миграции, создаёт демонстрационные данные и запускает:

- UI: <http://localhost:5173>
- Swagger UI: <http://localhost:5173/api/docs>
- OpenAPI JSON: <http://localhost:5173/api/docs-json>
- backend health: <http://localhost:3000/api/v1/health>
- PostgreSQL: `localhost:5432`

Данные PostgreSQL сохраняются в Docker volume. Повторный запуск безопасно выполняет миграции и идемпотентный seed заново.

## Демонстрационные аккаунты

| Аккаунт | Email | Пароль | Валюта |
| --- | --- | --- | --- |
| Личный | `personal@taler.local` | `TalerPersonal2026!` | RUB |
| Семейный | `family@taler.local` | `TalerFamily2026!` | EUR |

Учётные данные предназначены только для локальной разработки.

## Локальная разработка

Установите Node.js 24 и зависимости:

```bash
npm ci
```

Создайте `.env` на основе `.env.example`, затем используйте команды:

```bash
npm run prisma:validate --workspace=backend
npm run prisma:migrate --workspace=backend
npm run prisma:seed --workspace=backend
npm run start:dev --workspace=backend
npm run dev --workspace=frontend
```

## Проверки

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run test:e2e --workspace=backend
```

Архитектура описана в [ARCHITECTURE.md](ARCHITECTURE.md), подробный план — в [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
