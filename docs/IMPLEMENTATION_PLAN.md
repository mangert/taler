# Детализированный план реализации Taler

Этот документ развивает раздел 14 файла [ARCHITECTURE.md](../ARCHITECTURE.md). Блоки выполняются последовательно. Каждый блок завершается релевантными тестами, актуализацией Swagger или документации и небольшим тематическим Conventional Commit.

## 1. Подготовка монорепозитория и зависимостей

### 1.1. Инициализация структуры

- Создать корневой package.json с npm workspaces backend и frontend.
- Сгенерировать NestJS-приложение в backend без отдельного Git-репозитория и без установки зависимостей.
- Сгенерировать React + Vite + TypeScript приложение в frontend.
- Оставить один корневой package-lock.json и запускать workspace-команды из корня.
- Включить strict во всех TypeScript-конфигурациях и запретить any правилами ESLint.
- Создать каталоги согласно ARCHITECTURE.md и добавить минимальные index-файлы только там, где нужен публичный API модуля.

~~~sh
npm init -y
npx @nestjs/cli new backend --package-manager npm --skip-git --skip-install
npm create vite@latest frontend -- --template react-ts
npm install
~~~

### 1.2. Установка backend-зависимостей

Установить runtime-зависимости NestJS, Prisma, PostgreSQL, валидации, JWT, Swagger, scheduler и CSV:

~~~sh
npm install -w backend @nestjs/config @nestjs/swagger swagger-ui-express
npm install -w backend @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -w backend argon2 class-validator class-transformer cookie-parser helmet
npm install -w backend @nestjs/schedule csv-parse multer
npm install -w backend @prisma/client @prisma/adapter-pg pg
~~~

Установить инструменты разработки и типы:

~~~sh
npm install -D -w backend prisma tsx
npm install -D -w backend supertest @types/supertest
npm install -D -w backend @types/cookie-parser @types/passport-jwt @types/multer @types/pg
~~~

NestJS scaffold уже включает Jest; версии тестовых пакетов следует согласовать с текущей версией NestJS и не дублировать.

### 1.3. Установка frontend-зависимостей

Установить маршрутизацию, server state, формы, UI, графики и CSV:

~~~sh
npm install -w frontend react-router-dom @tanstack/react-query
npm install -w frontend react-hook-form @hookform/resolvers zod
npm install -w frontend @mui/material @mui/icons-material @emotion/react @emotion/styled
npm install -w frontend recharts papaparse
~~~

Установить тестовые и контрактные инструменты:

~~~sh
npm install -D -w frontend vitest jsdom
npm install -D -w frontend @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D -w frontend msw @types/papaparse openapi-typescript
~~~

HTTP-клиент строить на стандартном fetch: отдельная зависимость Axios не требуется.

### 1.4. Установка общих инструментов качества и E2E

- Установить в корне ESLint, Prettier и совместимые TypeScript plugins.
- Установить Playwright Test для воспроизводимых E2E-тестов; MCP используется только для интерактивной проверки.
- Установить Chromium для Playwright после фиксации package-lock.json.
- Зафиксировать стабильные версии прямых зависимостей и всегда коммитить lockfile.

~~~sh
npm install -D eslint prettier typescript-eslint
npm install -D @playwright/test
npx playwright install chromium
~~~

### 1.5. Скрипты и конфигурация

- Добавить корневые scripts: dev, lint, format:check, typecheck, test, build и e2e.
- Проксировать команды в workspaces через npm run --workspace либо npm run --workspaces.
- Создать .env.example с DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_ORIGIN, PORT и ограничениями CSV.
- Добавить проверку переменных окружения при старте backend.
- Настроить единые Prettier, ESLint и EditorConfig правила; JSON и YAML форматировать с отступом в два пробела.
- Критерий завершения: оба workspace компилируются, пустые тестовые наборы не считаются доказательством готовности.

## 2. Локальная инфраструктура и Docker Compose

### 2.1. PostgreSQL для разработки и тестов

- Описать development и test connection strings в .env.example без реальных паролей.
- Создать отдельную тестовую БД, которую integration-тесты могут детерминированно очищать.
- Настроить PostgreSQL healthcheck через pg_isready.
- Не применять destructive-команды к пользовательской БД; сброс допустим только для явно выделенной test database.

### 2.2. Backend-контейнер

- Создать многостадийный backend/Dockerfile с отдельными development и production этапами.
- Генерировать Prisma Client перед TypeScript build.
- Запускать production через скомпилированный dist.
- Добавить непривилегированного пользователя контейнера и не копировать .env в image.
- Создать endpoint GET /api/v1/health, проверяющий процесс и соединение с БД.

### 2.3. Frontend-контейнер и Nginx

- Создать frontend/Dockerfile: Vite build на первом этапе, Nginx на втором.
- Настроить fallback на index.html для React Router.
- Проксировать /api в backend, сохраняя cookie и исходные заголовки.
- Добавить Nginx healthcheck и разумные cache headers только для хешированных assets.

### 2.4. Compose-сценарий

> **Изменение порядка выполнения:** перед приёмкой пункта 2.4 досрочно выполнить пункты 3.1–3.3 и Swagger bootstrap из пункта 4.2. Это необходимо, потому что `db-init` зависит от готовых Prisma schema, миграции и идемпотентного seed, а критерий запуска одной командой требует доступного Swagger UI. После подготовки prerequisites вернуться к шагам 2.4 и проверить их в исходном порядке.

- Описать сервисы postgres, db-init, backend и frontend.
- В db-init выполнять prisma migrate deploy и явный prisma db seed; Prisma Client генерировать при сборке backend image.
- Запускать backend после успешного db-init, frontend — после healthy backend.
- Проверить первый запуск на пустом volume и повторный запуск без дублирования seed.
- Критерий завершения: docker compose up поднимает UI, Swagger и БД одной командой.

## 3. Prisma schema, миграция и seed

### 3.1. Инициализация Prisma и модель данных

- Выполнить prisma init для PostgreSQL в backend и настроить backend/prisma.config.ts.
- Использовать актуальный generator prisma-client с явным output для generated client.
- Описать User, Category, Transaction, Budget, RecurringTransaction и AuditLog.
- Добавить enums типов транзакций, действий аудита и типов аудируемых сущностей.
- Задать NUMERIC precision для денег и курсов, JSONB для снимков аудита, внешние ключи, уникальности и индексы из ARCHITECTURE.md.
- Никогда не включать userId владельца в публичные create/update DTO.

~~~sh
npm exec --workspace=backend -- prisma init --datasource-provider postgresql --no-skills
npm exec --workspace=backend -- prisma validate
npm exec --workspace=backend -- prisma format
~~~

### 3.2. Первая миграция и Prisma Client

- Создать миграцию с коротким snake_case именем create_initial_schema.
- Просмотреть migration.sql до применения и убедиться, что ограничения соответствуют schema.prisma.
- После миграции явно сгенерировать Prisma Client; не полагаться на неявную генерацию.
- Добавить scripts prisma:validate, prisma:generate, prisma:migrate и prisma:seed.

~~~sh
npm exec --workspace=backend -- prisma migrate dev --name create_initial_schema
npm exec --workspace=backend -- prisma generate
~~~

Любое последующее изменение schema.prisma выполнять только вместе с новой миграцией.

### 3.3. Идемпотентный seed

- Настроить seed: tsx prisma/seed.ts в prisma.config.ts.
- Создать ровно два независимых аккаунта «Личный» и «Семейный».
- Создать ровно 12 пользовательских категорий и ровно 3 бюджета, распределив их между аккаунтами.
- Создать не менее 200 реалистичных транзакций за последние шесть календарных месяцев.
- Добавить несколько активных recurring rules и audit-записи для seeded транзакций и бюджетов.
- Использовать стабильные идентификаторы и upsert либо проверяемую seed-версию, чтобы повторный запуск не создавал дубли.

~~~sh
npm exec --workspace=backend -- prisma db seed
~~~

### 3.4. Проверки слоя данных

> **Статус:** выполнено 19 сентября 2026 года. Команда `npm run test:data`
> пересоздаёт выделенную тестовую схему только из миграций, выполняет seed и
> запускает integration-тесты.

- Выполнить prisma validate, prisma generate и prisma migrate status.
- Написать integration-тест количества seed-сущностей, диапазона дат и раздельного владения.
- Проверить уникальности бюджета, категории и recurring occurrence.
- Проверить точность Decimal без преобразования финансовых значений в JavaScript number.
- Критерий завершения: схема воспроизводится с нуля только миграциями и seed.

## 4. Общая платформа backend и API-контракт

### 4.1. Bootstrap, конфигурация и ошибки

> **Статус:** выполнено 19 сентября 2026 года. Bootstrap, валидация, единый
> error shape, общие helpers и безопасное request logging подтверждены unit- и
> Supertest-тестами.

- Включить глобальный префикс /api/v1, cookie parser, Helmet и ограниченный CORS.
- Настроить ValidationPipe с transform, whitelist и forbidNonWhitelisted.
- Реализовать единый exception filter с полями statusCode, code, message и details.
- Создать helpers для Decimal serialization, ISO dates, ownership lookup и пагинации.
- Добавить request logging без cookie, JWT, passwordHash и CSV-содержимого.

### 4.2. Swagger и клиентские типы

- Настроить Swagger UI по /api/docs и JSON по /api/docs-json.
- Описать cookie JWT security scheme, DTO, query parameters, ответы и ошибки.
- Добавить frontend script api:generate на основе openapi-typescript.
- Запретить ручное расхождение frontend типов с OpenAPI.
- Добавить smoke-тест доступности Swagger UI и JSON.

### 4.3. Общие DTO и фильтры

- Создать PaginationQueryDto, PaginatedMetaDto и стабильные string enums.
- Централизовать максимальный pageSize 100 и детерминированную сортировку.
- Различать omitted и explicit null в update DTO.
- Создать общий filter builder транзакций, который будет использоваться списком, export и dashboard там, где применимо.

### 4.4. Тестовый каркас backend

- Настроить отдельную test database и helper для создания Nest testing app.
- Создать factories для двух пользователей и их данных.
- Добавить helper аутентификации Supertest через JWT cookie.
- Проверять тело и side effects, а не только HTTP status.
- Критерий завершения: базовые 400, 401, 404 и error shape доказаны integration-тестами.

## 5. Регистрация, авторизация и профиль

### 5.1. Функциональные задачи backend

- Реализовать POST /auth/register, POST /auth/login, POST /auth/logout и GET /auth/me.
- Нормализовать email, проверять уникальность и хешировать пароль Argon2.
- Выпускать короткоживущий JWT в HttpOnly, SameSite=Strict cookie; Secure включать в production.
- Реализовать JWT guard и current-user decorator.
- Реализовать PATCH /users/me для displayName, timeZone и baseCurrency.
- Запрещать изменение baseCurrency после первой транзакции кодом BASE_CURRENCY_LOCKED.
- Не возвращать passwordHash и внутренние JWT claims.

### 5.2. React-компоненты

- Создать AuthLayout, LoginForm, RegisterForm, ProtectedRoute и AuthProvider.
- Создать ProfileForm для имени, timezone и основной валюты.
- При старте приложения запрашивать /auth/me и корректно обрабатывать истёкшую сессию.
- Использовать React Hook Form + Zod; серверные field errors связывать с полями.
- После logout очищать только клиентский cache, не хранить JWT в localStorage.

### 5.3. Стили и доступность

- Оформить компактную auth-card на desktop и полноширинную форму на mobile.
- Использовать MUI theme tokens, а не локальные hard-coded цвета.
- Добавить видимые labels, password visibility control и доступный общий alert.
- Переводить фокус на первое невалидное поле; блокировать повторную отправку формы.

### 5.4. Тесты

- Supertest: регистрация, duplicate email, неверный пароль, cookie flags, logout, 401 и locked currency.
- Testing Library: клиентская валидация, server error, pending state и успешная навигация.
- E2E: вход каждым seed-аккаунтом и отсутствие доступа к защищённой странице после logout.

## 6. Справочник категорий

### 6.1. Функциональные задачи backend

- Реализовать CRUD /categories и case-insensitive search по имени.
- Всегда назначать userId из JWT и проверять уникальность имени внутри пользователя.
- Валидировать icon, цвет в согласованном формате и type.
- Возвращать 404 для чужой категории.
- Запрещать удаление используемой категории кодом CATEGORY_IN_USE.
- Документировать DTO, 409 cases и примеры Swagger.

### 6.2. React-компоненты

- Создать CategoriesPage, CategoryGrid, CategoryCard, CategoryFormDialog и DeleteCategoryDialog.
- Добавить IconPicker, ColorPicker и строку поиска.
- Реализовать loading skeleton, recoverable error, empty state и success state.
- После mutation инвалидировать только category keys и зависимые summary keys.

### 6.3. Стили и responsive

- Показывать категории сеткой карточек; менять число колонок через MUI breakpoints.
- Проверять контраст текста с выбранным цветом категории.
- Не передавать значение только цветом: всегда показывать иконку и название.
- На mobile использовать полноэкранный dialog либо удобную нижнюю форму.

### 6.4. Тесты

- Supertest: CRUD, duplicate name, invalid color, ownership и CATEGORY_IN_USE.
- Testing Library: поиск, создание, изменение, подтверждение удаления и все состояния списка.
- E2E: пользователь создаёт категорию и видит только её в своём аккаунте.

## 7. Транзакции, фильтры и пагинация

### 7.1. Функциональные задачи backend

- Реализовать CRUD /transactions с полями amount, date, category, description, type, currency и exchangeRateToBase.
- Рассчитывать baseAmount на backend; для основной валюты требовать курс 1.
- Проверять принадлежность категории и соответствие её type типу операции.
- Реализовать search по description и комбинируемые фильтры dateFrom, dateTo, categoryId, minAmount, maxAmount и type.
- Валидировать dateFrom <= dateTo и minAmount <= maxAmount.
- Реализовать page, pageSize и сортировку transactionDate DESC, id DESC.
- Возвращать 404 при доступе к чужой записи; не принимать userId и baseAmount от клиента.

### 7.2. React-компоненты

- Создать TransactionsPage, TransactionsFilterBar, TransactionsTable, TransactionCardList и PaginationControls.
- Создать TransactionFormDialog и DeleteTransactionDialog.
- Хранить фильтры и страницу в URL search params.
- Показывать поле курса только для валюты, отличной от основной.
- Добавить сброс фильтров и отображение активных filter chips.
- Использовать отдельную query-key factory, включающую все параметры списка.

### 7.3. Стили и responsive

- На desktop использовать таблицу с фиксированными действиями и читаемым выравниванием денег.
- На mobile заменять таблицу карточками без горизонтального scroll.
- Доход и расход различать знаком, текстом и доступной иконкой, а не только цветом.
- Фильтры на mobile помещать в drawer; основные дата и категория остаются быстро доступными.
- Форматировать валюту и дату через Intl с явной locale и timezone.

### 7.4. Тесты

- Supertest: CRUD, Decimal, validation, ownership, все фильтры, комбинации, границы и пагинация.
- Testing Library: URL filters, loading/error/empty/success, form validation и mutation outcomes.
- E2E: создать, отфильтровать, изменить и удалить транзакцию в desktop и mobile viewport.

## 8. Аудит транзакций и бюджетов

### 8.1. Функциональные задачи backend

- Реализовать AuditService, принимающий Prisma transaction client.
- Создавать mutation и AuditLog в одной database transaction.
- Для CREATE сохранять after, для UPDATE — before и after, для DELETE — before.
- Сериализовать Decimal строками и исключать secrets и служебные поля.
- Реализовать GET /audit-log с pagination и фильтрами entityType, action, dateFrom и dateTo.
- Запретить изменение и удаление audit-записей.

### 8.2. React-компоненты

- Создать AuditLogPage, AuditFilterBar, AuditTable, AuditCardList и AuditDetailsDialog.
- В деталях показывать понятное сравнение before/after, а не сырой JSON.
- Добавить ссылки на существующие сущности без ошибки для уже удалённых записей.
- Реализовать loading, error, empty и paginated success states.

### 8.3. Стили и доступность

- Выделять changed fields семантически и сопровождать цвет текстовой меткой.
- На mobile показывать audit entry как timeline/card.
- Обеспечить клавиатурное открытие и закрытие диалога деталей.
- Форматировать timestamps в timezone пользователя с указанием даты и времени.

### 8.4. Тесты

- Integration: CREATE/UPDATE/DELETE snapshots, atomic rollback и user visibility.
- Проверить аудит операций CSV и scheduler.
- Component: фильтры, before/after rendering и deleted entity.
- E2E: изменение транзакции появляется в журнале текущего пользователя.

## 9. Месячные бюджеты

### 9.1. Функциональные задачи backend

- Реализовать CRUD /budgets с уникальностью userId, categoryId и month.
- Разрешать бюджет только для расходной категории текущего пользователя.
- Хранить limitAmount в основной валюте пользователя.
- Рассчитывать spentAmount, remainingAmount, progressPercent и isExceeded из baseAmount.
- Использовать границы месяца в timezone пользователя.
- Аудировать каждое создание, изменение и удаление бюджета атомарно.

### 9.2. React-компоненты

- Создать BudgetsPage, MonthSelector, BudgetGrid, BudgetCard, BudgetFormDialog и DeleteBudgetDialog.
- Показывать лимит, расход, остаток и progress bar.
- Добавить состояние превышения и понятный текст при отсутствии операций.
- Обновлять budget и dashboard queries после mutation.

### 9.3. Стили и responsive

- Использовать сетку карточек с одинаковой высотой на desktop и один столбец на mobile.
- Progress bar сопровождать числовым процентом и текстом; не полагаться только на цвет.
- Для превышения использовать theme error token и доступную подпись.
- Сохранять корректный layout при процентах больше 100.

### 9.4. Тесты

- Supertest: CRUD, uniqueness conflict, wrong category, ownership, month boundaries и currency totals.
- Проверить audit side effects и rollback.
- Testing Library: создание, изменение месяца, normal/exceeded/no-spending states.
- E2E: создать бюджет и увидеть обновление progress после расходной транзакции.

## 10. Dashboard и визуализация

### 10.1. Функциональные задачи backend

- Реализовать GET /dashboard?months=6.
- Возвращать totals income, expense и balance в основной валюте.
- Возвращать расходы по категориям, доходы/расходы по шести месяцам и top-5 категорий.
- Заполнять пропущенные месяцы нулевыми значениями и задавать стабильный порядок.
- Выполнять ownership filtering во всех агрегатах.
- Проверить SQL/Prisma queries на одном наборе фиксированных данных.

### 10.2. React-компоненты

- Создать DashboardPage, SummaryCards, ExpensesPieChart, MonthlyDynamicsChart, TopCategoriesList и DashboardTextSummary.
- Преобразовывать API DTO в chart data вне chart-компонентов.
- Создать самостоятельные no-data состояния для каждого виджета.
- Обеспечить refetch после изменений транзакций, бюджетов и CSV import.

### 10.3. Стили и responsive

- Построить responsive dashboard grid на MUI.
- Использовать ResponsiveContainer для Recharts и ограничивать высоту графиков.
- Применять цвета категорий, но сохранять различимость через legend и подписи.
- На mobile располагать графики вертикально и не обрезать tooltips.
- Предоставлять текстовую таблицу или summary для данных каждого графика.

### 10.4. Тесты

- Unit/integration: точные totals, six-month series, zero months, top-5 и ownership.
- Component: loading, error, no-data, tooltips/legend labels и textual summary.
- E2E: seed dashboard на desktop и mobile без overflow и console errors.

## 11. CSV-импорт и экспорт

### 11.1. Функциональные задачи backend

- Реализовать POST /transaction-imports как multipart endpoint.
- Валидировать MIME type, размер, число строк, encoding, обязательные mappings и категории.
- Парсить CSV на backend независимо от frontend preview.
- Собирать row-number errors без записи данных.
- При полном успехе одной Prisma transaction создавать все транзакции и audit entries.
- Реализовать GET /transactions/export на общем filter builder без pagination.
- Экранировать CSV formula injection и выставлять Content-Type и Content-Disposition.

### 11.2. React-компоненты

- Создать TransactionImportPage, CsvFileStep, ColumnMappingStep, ImportPreview и ImportResult.
- Читать headers/sample через Papa Parse, но не считать preview серверной валидацией.
- Предлагать mapping для date, amount, category, description, type, currency и rate.
- Показать ошибки по номерам строк и позволить вернуться к mapping.
- Добавить ExportTransactionsButton, использующий текущие URL filters.

### 11.3. Стили и responsive

- Реализовать доступный stepper с текстовыми названиями шагов.
- На mobile отображать mapping как вертикальную форму вместо широкой таблицы.
- Ошибки строк показывать списком с возможностью перехода к началу блока.
- Для upload area обеспечить keyboard activation и обычную кнопку выбора файла.

### 11.4. Тесты

- Supertest: valid import, each validation class, full rollback, ownership, limits и audit count.
- Проверить, что export и list выбирают одинаковый набор при одинаковых фильтрах.
- Component: mapping, duplicate mapping, server row errors, pending и success.
- E2E: импортировать fixture CSV и экспортировать отфильтрованный результат.

## 12. Повторяющиеся транзакции

### 12.1. Функциональные задачи backend

- Реализовать CRUD /recurring-transactions и ownership checks.
- Валидировать dayOfMonth, диапазон дат, категорию, валюту и ручной курс.
- Рассчитывать nextRunAt в timezone пользователя; 29–31 переносить на последний день короткого месяца.
- Создать один scheduler handler с запретом параллельного выполнения.
- При старте и по cron обрабатывать все nextRunAt <= now до актуальной даты.
- В одной transaction создавать Transaction, AuditLog и обновлять nextRunAt.
- Обрабатывать unique conflict occurrence как безопасный повтор, а не создавать дубль.

### 12.2. React-компоненты

- Создать RecurringTransactionsPage, RecurringRuleList, RecurringRuleCard, RecurringRuleFormDialog и DeleteRecurringRuleDialog.
- Показывать next run, active status и понятное описание расписания.
- Добавить включение/выключение правила через PATCH.
- Показывать курс для неосновной валюты и предупреждение о ручном обновлении.

### 12.3. Стили и responsive

- На desktop использовать компактный список, на mobile — карточки.
- Статус active/inactive сопровождать текстом и доступной иконкой.
- Дату следующего запуска показывать в timezone пользователя.
- Destructive delete отделить от безопасного pause.

### 12.4. Тесты

- Unit с fake clock: обычный месяц, 29–31, leap year, endDate и timezone.
- Integration: catch-up после простоя, idempotency, atomic audit и ownership.
- Component: create/edit/pause/delete и validation states.
- E2E: создать правило и проверить его отображение; выполнение scheduler проверять детерминированным backend-тестом.

## 13. Общий UI, стили, доступность и E2E

### 13.1. React application shell

- Создать AppRouter, AppProviders, QueryClient factory, ErrorBoundary и protected layout.
- Создать AppHeader, ResponsiveNavigation, UserMenu, PageHeader и ConfirmDialog.
- Настроить ленивую загрузку route-level страниц.
- Создать test render helper с Router, MUI theme и новым QueryClient для каждого теста.
- Не переносить feature-specific компоненты в shared без второго реального consumer.

### 13.2. Система стилей

- Создать frontend/src/app/theme с palette, typography, spacing, shape и component overrides.
- Использовать MUI sx только для локальной компоновки; повторяемые решения переносить в theme или shared components.
- Определить единые размеры forms, tables, cards, dialogs и chart containers.
- Использовать breakpoints mobile-first и проверить ширины 390 px и 1440 px.
- Не использовать hard-coded цвета бизнес-состояний вне theme tokens.

### 13.3. Общие состояния и доступность

- Создать LoadingState, ErrorState, EmptyState и PageSkeleton.
- Обеспечить visible focus, keyboard navigation, labels и aria-describedby.
- Проверить contrast, reduced motion и отсутствие информации, передаваемой только цветом.
- Добавить skip link и корректную иерархию headings.
- Проверять отсутствие uncaught errors и console errors в E2E.

### 13.4. Playwright E2E

- Настроить webServer либо Compose baseURL, desktop и mobile projects.
- Реализовать минимум: login/logout, category + transaction CRUD, filters, budget progress, CSV и audit.
- Использовать отдельные тестовые данные или повторно создаваемые fixtures.
- Не заменять E2E-тестами unit/integration coverage.
- Сохранять traces/screenshots только при failure, чтобы не раздувать репозиторий.

## 14. CI, документация и итоговая приёмка

### 14.1. GitHub Actions

- Создать job quality: npm ci, format:check, lint и typecheck.
- Создать job tests с PostgreSQL service container, migration deploy и Jest/Vitest.
- Создать job build для backend и frontend.
- Создать job compose, выполняющий docker compose config и сборку images.
- Добавить E2E smoke job после build; публиковать report только при failure.
- Не считать тестовый job успешным при нуле ожидаемых тестов.

### 14.2. Проверка Docker-демо

- Выполнить запуск на чистом volume одной командой docker compose up.
- Проверить healthchecks, Swagger UI, оба seed-login, количество seed-данных и все основные страницы.
- Повторить запуск и убедиться, что seed не дублируется.
- Проверить graceful startup после временной недоступности PostgreSQL.
- Зафиксировать точную последовательность проверки в README.

### 14.3. Документация

- Заполнить README: prerequisites, env, запуск, миграции, seed, lint, tests, build и demo credentials.
- Поддерживать Swagger и generated frontend types в одном изменении с API.
- Обновлять ARCHITECTURE.md при изменении архитектурного решения.
- REPORT.md изменяет только владелец проекта, постепенно фиксируя удачные и неудачные шаги.
- Добавить при необходимости ссылку на видео-демонстрацию как необязательное доказательство.

### 14.4. Финальный checklist

- Сопоставить каждую строку таблицы трассировки ARCHITECTURE.md с работающим UI/API и конкретным тестом.
- Подтвердить минимум десять реально обнаруженных unit/integration tests; целевой набор должен быть существенно больше.
- Запустить из корня format:check, lint, typecheck, test, build и e2e.
- Проверить docker compose config и чистый docker compose up.
- Проверить отсутствие secrets, any, debug code, несвязанных изменений и незадокументированных решений.
- Финальный результат считать готовым только после зелёного CI и воспроизводимого локального демо.
