# Taler

Taler — полнофункциональное приложение для учёта личных финансов. Проект состоит из NestJS API, React-интерфейса и PostgreSQL.

## Предварительные требования

Для запуска всего приложения нужен Docker Desktop с Docker Compose и свободные порты `5173`, `3000`, `5432`. Для локальной разработки и npm-проверок нужны Node.js 24 и npm; PostgreSQL можно запустить отдельно через Compose.

## Запуск через Docker Compose

Из корня репозитория выполните:

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

## Приёмка Docker-демо

[Посмотреть беззвучную видеодемонстрацию](docs/taler-demo.webm) — регистрация, обзор, транзакции, бюджеты, повторяющиеся операции и журнал аудита.

Проверяйте демо в отдельном Compose-проекте: его имя создаёт собственный PostgreSQL volume и не затрагивает обычный `taler_postgres_data`. Порты `5173`, `3000` и `5432` должны быть свободны. Ниже — последовательность для PowerShell; при повторной приёмке выберите новое имя проекта вместо удаления существующего volume.

```powershell
docker volume inspect taler_demo_check_postgres_data # ожидается: volume не найден
docker compose -p taler_demo_check up --build --wait --wait-timeout 600
docker compose -p taler_demo_check ps --all
```

Ожидаются `healthy` у PostgreSQL, backend и frontend, `Exited (0)` у `db-init`. Откройте UI на <http://localhost:5173>, Swagger UI на <http://localhost:5173/api/docs> и OpenAPI JSON на <http://localhost:5173/api/docs-json>. Проверьте `200` и `checks.database: up` на <http://localhost:3000/api/v1/health>, затем войдите по очереди под обоими демо-аккаунтами из таблицы выше.

Сверьте число записей в базе. Порядок столбцов: пользователи, категории, транзакции, бюджеты, повторяющиеся правила, аудит. На чистом volume ожидается `2|12|240|3|4|243`:

```powershell
$seedCounts = @"
SELECT (SELECT count(*) FROM "User"),
       (SELECT count(*) FROM "Category"),
       (SELECT count(*) FROM "Transaction"),
       (SELECT count(*) FROM "Budget"),
       (SELECT count(*) FROM "RecurringTransaction"),
       (SELECT count(*) FROM "AuditLog");
"@
$seedCounts | docker compose -p taler_demo_check exec -T postgres psql -U taler_dev -d taler_dev -At
docker compose -p taler_demo_check up --no-build --force-recreate --wait --wait-timeout 600
docker compose -p taler_demo_check logs db-init --tail 20
$seedCounts | docker compose -p taler_demo_check exec -T postgres psql -U taler_dev -d taler_dev -At
```

После повторного запуска `db-init` должен снова завершиться с кодом `0`, а счётчики — остаться прежними. Для проверки основных страниц (`/`, `/profile`, `/categories`, `/transactions`, `/transaction-imports`, `/budgets`, `/recurring-transactions`, `/audit-log`) запустите из корня репозитория `npx playwright test --reporter=line` при установленных npm-зависимостях и Chromium для Playwright. Тесты используют уже работающий UI на порту `5173` и проверяют оба аккаунта, desktop и mobile; выполняйте их после сравнения seed, поскольку сценарии меняют тестовые данные.

Отдельно проверьте временную недоступность БД только в этом тестовом проекте:

```powershell
docker compose -p taler_demo_check stop frontend backend postgres
docker start taler_demo_check-backend-1
curl.exe -i http://localhost:3000/api/v1/health # ожидается HTTP 503
docker compose -p taler_demo_check start postgres
curl.exe -i http://localhost:3000/api/v1/health # дождитесь HTTP 200
docker compose -p taler_demo_check start frontend
docker compose -p taler_demo_check ps --all
```

Backend должен оставаться запущенным при `503` и без собственного перезапуска стать `healthy` после возврата PostgreSQL. `start frontend` повторно запускает `db-init`; при необходимости снова сверьте `$seedCounts`. По окончании можно остановить только проверочный проект командой `docker compose -p taler_demo_check stop` — volume останется для анализа.

## Локальная разработка

Установите зависимости и запустите только PostgreSQL (на первом запуске он также создаст отдельную базу `taler_test`):

```bash
npm ci
docker compose up -d postgres
```

Скопируйте корневой `.env.example` в `backend/.env`: Prisma CLI запускается из `backend/` и читает переменные именно там. Для корневой команды `npm run test:data` также создайте `.env` в корне с теми же URL баз данных. Оба файла игнорируются Git; замените примерные секреты при использовании вне локального демо и не коммитьте их.

Основные переменные окружения:

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Подключение к основной PostgreSQL-базе; пример рассчитан на Compose PostgreSQL на `localhost:5432`. |
| `TEST_DATABASE_URL` | Отдельная база с суффиксом `_test` для тестов данных; `test:data` пересоздаёт в ней схему `public`. |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Секрет подписи токенов (не короче 32 символов) и срок их действия. |
| `FRONTEND_ORIGIN`, `PORT` | Адрес frontend для CORS и порт backend. |
| `CSV_MAX_FILE_SIZE_BYTES`, `CSV_MAX_ROWS` | Лимиты CSV-импорта. |

Примените существующие миграции, сгенерируйте Prisma Client и заполните демонстрационные данные:

```bash
npm run prisma:validate --workspace=backend
npm run prisma:migrate:deploy --workspace=backend
npm run prisma:generate --workspace=backend
npm run prisma:seed --workspace=backend
npm run dev
```

Последняя команда одновременно запускает backend на `http://localhost:3000` и frontend на `http://localhost:5173`. При разработке схемы используйте `npm run prisma:migrate --workspace=backend` для создания новой миграции; при обычном запуске достаточно `prisma:migrate:deploy`. Seed можно повторять без дублирования демо-данных.

## Клиентские типы API

После запуска backend с доступным OpenAPI JSON на <http://localhost:3000/api/docs-json> сгенерируйте типы frontend:

```bash
npm run api:generate
```

При изменении API обновляйте DTO и Swagger-декораторы, затем генерируйте `frontend/src/shared/api/schema.d.ts` в том же изменении. Файл хранится в Git и не редактируется вручную. Проверить его соответствие текущему OpenAPI-контракту при работающем backend:

```bash
npm run api:check
```

## Повторяющиеся транзакции

Защищённый API `/api/v1/recurring-transactions` позволяет создать, просмотреть, изменить, приостановить и удалить ежемесячное правило. При создании нужны `categoryId`, `type`, десятичные строки `amount` и `exchangeRateToBase`, трёхбуквенная `currency`, `dayOfMonth` (1–31) и `startDate` (`YYYY-MM-DD`); `endDate`, `description` и `isActive` необязательны. Планировщик запускается при старте backend и каждую минуту, догоняет пропущенные месяцы и создаёт операции в полночь часового пояса пользователя. Дни 29–31 сокращаются до последнего дня месяца. `PATCH` с `isActive: false` приостанавливает правило, а `DELETE` удаляет его; уже созданные операции остаются.

## Проверки

```bash
npm run format:check
npm run lint
npm run test
npm run typecheck
npm run build
npm run test:e2e --workspace=backend
npm run e2e
npm run e2e:ui
npm run test:data
```

`npm run build` собирает backend и frontend; для него не требуется запущенный Docker. Команды `lint`, `test`, `typecheck` и `build` выполняются из корня для обоих приложений.

На каждом push и pull request workflow `.github/workflows/ci.yml` проверяет
форматирование, lint, типы, Jest/Vitest и сборку. Тестовый job поднимает
PostgreSQL service, применяет миграции к отдельной базе `taler_test` и запускает
также backend E2E и интеграционные тесты данных. Отдельные jobs проверяют
`docker compose config`, сборку образов и короткий Playwright smoke на desktop и
mobile. Отчёт Playwright публикуется только при ошибке.

Корневая команда `npm run e2e` сначала запускает backend E2E, затем Playwright.
Для браузерных сценариев требуется запущенный Docker daemon: Playwright поднимает
полный Compose-стек, дожидается frontend `/healthz` и использует два
демонстрационных аккаунта из seed. После локального запуска сервисы можно
остановить без удаления данных командой `docker compose stop`.

`npm run e2e:ui` собирает frontend и проверяет CRUD категорий и транзакций,
фильтры, аудит и прогресс бюджета в отдельных desktop/mobile Chromium-проектах
с изолированными ответами API. Docker для него не нужен; он дополняет, но не
заменяет полный `npm run e2e` с PostgreSQL и backend. Браузерные screenshots
и traces сохраняются только при падении теста в игнорируемом `test-results/`.
Полный E2E использует уникальные маркеры и удаляет тестовые категории,
транзакции, бюджеты и правила после сценариев. Неизменяемый журнал аудита при
этом пополняется; для многократных прогонов лучше использовать отдельный Compose
volume, чтобы не смешивать тестовую историю с демонстрационной.

Команда `test:data` предназначена для проверки слоя данных: она пересоздаёт
схему `public` только в выделенной базе `taler_test`, применяет миграции,
выполняет seed и запускает integration-тесты. Пользовательский
`TEST_DATABASE_URL` обязан оканчиваться на `_test` и не совпадать с
`DATABASE_URL`.

Архитектура описана в [ARCHITECTURE.md](ARCHITECTURE.md), подробный план — в [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).
