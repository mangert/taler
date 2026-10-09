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
npm run prisma:generate --workspace=backend
npm run prisma:seed --workspace=backend
npm run start:dev --workspace=backend
npm run dev --workspace=frontend
```

## Клиентские типы API

После запуска backend с доступным OpenAPI JSON сгенерируйте типы frontend:

```bash
npm run api:generate
```

Сгенерированный файл `frontend/src/shared/api/schema.d.ts` хранится в Git и
не редактируется вручную. Проверить его соответствие текущему OpenAPI-контракту:

```bash
npm run api:check
```

## Повторяющиеся транзакции

Защищённый API `/api/v1/recurring-transactions` позволяет создать, просмотреть, изменить, приостановить и удалить ежемесячное правило. При создании нужны `categoryId`, `type`, десятичные строки `amount` и `exchangeRateToBase`, трёхбуквенная `currency`, `dayOfMonth` (1–31) и `startDate` (`YYYY-MM-DD`); `endDate`, `description` и `isActive` необязательны. Планировщик запускается при старте backend и каждую минуту, догоняет пропущенные месяцы и создаёт операции в полночь часового пояса пользователя. Дни 29–31 сокращаются до последнего дня месяца. `PATCH` с `isActive: false` приостанавливает правило, а `DELETE` удаляет его; уже созданные операции остаются.

## Проверки

```bash
npm run lint
npm run test
npm run typecheck
npm run build
npm run test:e2e --workspace=backend
npm run e2e
npm run e2e:ui
npm run test:data
```

Корневая команда `npm run e2e` сначала запускает backend E2E, затем Playwright.
Для браузерных сценариев требуется запущенный Docker daemon: Playwright поднимает
полный Compose-стек, дожидается frontend `/healthz` и использует два
демонстрационных аккаунта из seed. После локального запуска сервисы можно
остановить без удаления данных командой `docker compose stop`.

`npm run e2e:ui` собирает frontend и проверяет CRUD-сценарий транзакции в
desktop/mobile Chromium с изолированными ответами API. Docker для него не
нужен; он дополняет, но не заменяет полный `npm run e2e` с PostgreSQL и backend.

Команда `test:data` предназначена для проверки слоя данных: она пересоздаёт
схему `public` только в выделенной базе `taler_test`, применяет миграции,
выполняет seed и запускает integration-тесты. Пользовательский
`TEST_DATABASE_URL` обязан оканчиваться на `_test` и не совпадать с
`DATABASE_URL`.

Архитектура описана в [ARCHITECTURE.md](ARCHITECTURE.md), подробный план — в [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
