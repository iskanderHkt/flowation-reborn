---
name: flowation-reborn project context
description: Полный контекст проекта Flowation Reborn — архитектура, стек, фронтенд, бекенд, что реализовано, что предстоит
type: project
---

## Что такое Flowation

Платформа тестовой автоматизации API без написания кода. Пользователь собирает тесты из блоков (операций), запускает их и видит результат.

**Цель переписывания:** с распределённой системы (Java API + Go worker + RabbitMQ + Redis + Postgres) на модульный монолит (один JAR + Postgres) + React SPA фронтенд.

---

## Стек

### Backend (`flowation-api-modulith`)
- **Spring Boot 4.0.4**, Java 21, Maven
- **PostgreSQL 16** (Docker, порт 4321)
- Архитектура: модульный монолит (дисциплина пакетов, без Spring Modulith)
- Credentials БД: flowation-db / fw_user / fw_password
- Порт: **2121**

### Frontend (`flowation-ui`)
- **React 19** + **Vite 8** + TypeScript + SWC
- **Tailwind CSS v4** с `@theme` CSS-переменными (тёмная тема, фиолетовый акцент)
- **TanStack Router** (code-based typed routes)
- **TanStack Query** (серверный стейт, мутации, кеш-инвалидация)
- **CodeMirror 6** (JSON + SQL подсветка, readOnly для результатов)
- **Zod** (валидация форм операций)
- **ky** HTTP клиент + Vite proxy `/api` → `localhost:2121`
- Порт: **2122**

---

## Структура фронтенда

```
flowation-ui/src/
├── api/
│   ├── client.ts              — ky instance с /api prefix
│   ├── operations.ts          — API функции (getAll, getById, create, update, delete, execute, getExecutions)
│   ├── types.ts               — TypeScript типы (Operation, OperationConfig, ExecutionResult, etc.)
│   └── validation.ts          — Zod схемы для всех типов конфигов + validateOperationForm()
├── components/
│   ├── ui/                    — примитивы дизайн-системы
│   │   ├── badge.tsx          — Badge (default/success/error/warning/info/muted)
│   │   ├── button.tsx         — Button (primary/secondary/ghost, sm/md)
│   │   ├── input.tsx          — Input с label
│   │   ├── select.tsx         — Select с label
│   │   ├── spinner.tsx        — Loading spinner
│   │   ├── tabs.tsx           — Tab компонент
│   │   ├── toast.tsx          — Toast контекст + провайдер + UI (success/error/info, auto-dismiss)
│   │   └── confirm-popover.tsx — Inline confirm popover (portal-based, для delete)
│   ├── execution/             — разбитый ExecutionPanel (бывший монолит 679 строк)
│   │   ├── status-badge.tsx   — STATUS_BADGE маппинг
│   │   ├── collapsible.tsx    — Collapsible секция
│   │   ├── result-view.tsx    — ResultView (диспетчер: HTTP/SQL/Assert)
│   │   ├── http-result-view.tsx — HTTP request/response карточки
│   │   ├── sql-result-view.tsx  — SQL query + result таблица
│   │   ├── sql-table.tsx      — DataGrip-style таблица (sort, filter)
│   │   ├── assert-result-view.tsx — Assertion expression + actual/expected
│   │   └── history-list.tsx   — Expandable execution history
│   ├── execution-panel.tsx    — Barrel: tabs Result/History, ре-экспорт ResultView
│   ├── operation-form.tsx     — Форма операции (HTTP/SQL/Assert sub-forms) + inline validation errors
│   ├── quick-run-drawer.tsx   — Resizable slide-out drawer для быстрого запуска с превью конфига
│   ├── key-value-editor.tsx   — Postman-style key-value editor для headers
│   ├── code-editor.tsx        — CodeMirror wrapper (JSON/SQL, readOnly mode)
│   ├── resize-handle.tsx      — Drag-to-resize handle (vertical)
│   ├── error-boundary.tsx     — React Error Boundary с fallback UI
│   ├── sidebar.tsx            — Collapsible sidebar с навигацией
│   └── layout.tsx             — Sidebar + Outlet shell
├── hooks/
│   ├── use-operations.ts      — TanStack Query хуки (useOperations, useOperation, useCreate/Update/Delete/Execute, useExecutionHistory)
│   ├── use-sort.ts            — Generic sort hook
│   └── use-pagination.ts      — Generic pagination hook
├── routes/operations/
│   ├── index.tsx              — Список операций (фильтр по типу, поиск, сортировка, пагинация, quick-run drawer)
│   ├── new.tsx                — Создание операции (с валидацией)
│   └── edit.tsx               — Редактирование операции (dirty tracking, Save & Run, с валидацией)
├── lib/cn.ts                  — Tailwind cn() утилита
├── router.tsx                 — TanStack Router (routes + ErrorBoundary обёртки)
├── main.tsx                   — Entry point (QueryClient + ToastProvider + RouterProvider)
└── index.css                  — Тёмная тема (CSS-переменные, скроллбар, CodeMirror overrides)
```

---

## Структура бекенда

```
kg.ademity.flowation_api_modulith
├── flow_module/
│   └── operation/
│       ├── Operation.java               — entity (@Table("operations"))
│       ├── OperationType.java           — enum: HTTP_REQUEST | SQL_QUERY | ASSERTION
│       ├── OperationRepository.java
│       ├── OperationService.java        — CRUD, использует DevContext
│       ├── OperationController.java     — /api/operations
│       └── config/
│           ├── OperationConfig.java     — sealed interface + @JsonTypeInfo
│           ├── HttpOperationConfig.java — method, url, headers, body, timeoutMs
│           ├── SqlOperationConfig.java  — dbType, connectionString, query
│           └── AssertOperationConfig.java — expression, comparator, expected
│       └── dto/request/
│           ├── OperationCreateRequest.java
│           └── OperationUpdateRequest.java
│
├── execution_module/
│   ├── InstantExecutionService.java     — execute() + getHistory()
│   ├── InstantExecutionController.java  — /api/operations/{id}/execute, /api/operations/{id}/executions
│   ├── dto/
│   │   └── ExecutionResultResponse.java
│   ├── run/
│   │   ├── ExecutionRun.java            — entity (@Table("execution_runs"))
│   │   ├── ExecutionStepResult.java     — entity (@Table("execution_step_results"))
│   │   ├── ExecutionRunRepository.java
│   │   ├── ExecutionStepResultRepository.java
│   │   ├── RunMode.java                 — INSTANT | FLOW | BATCH
│   │   └── ExecutionStatus.java        — PENDING | RUNNING | COMPLETED | FAILED | SKIPPED
│   └── executor/
│       ├── OperationExecutor.java       — interface: supports() + execute()
│       ├── StepResult.java             — record: status, snapshots, error, durationMs (failure с/без response)
│       ├── VariableResolver.java       — резолвит {{variable}} из context Map
│       ├── HttpOperationExecutor.java  — java.net.http.HttpClient
│       ├── SqlOperationExecutor.java   — DriverManager.getConnection() динамически
│       └── AssertOperationExecutor.java — EQ|NEQ|CONTAINS|REGEX|GT|LT|IS_NULL
│
└── shared/
    ├── DevContext.java                 — бин с DEV_USER_ID (mock пока нет auth)
    ├── JacksonConfig.java              — ObjectMapper бин + JavaTimeModule
    └── jdbc/
        ├── JdbcConvertersConfig.java   — регистрирует все конвертеры
        ├── OperationConfigReadConverter.java  — PGobject → OperationConfig
        ├── OperationConfigWriteConverter.java — OperationConfig → PGobject
        ├── JsonMapReadConverter.java          — PGobject → Map<String,Object>
        └── JsonMapWriteConverter.java         — Map<String,Object> → PGobject
```

---

## БД схема (10 таблиц)

```
Identity            OperationCatalog        Flow
users               operation_groups        flows
                    operations              flow_steps
                                            extraction_rules
Environment         Execution
environments        execution_runs
env_variables       execution_step_results
```

Mock dev user: `00000000-0000-0000-0000-000000000001` (dev@flowation.local)

---

## Mock окружение для тестов

- **docker-compose.mock.yml** — PostgreSQL на порту 5433 (ecommerce БД)
- **mock-ecommerce/** — Go API на порту 8081 (products, orders)
- Go API запускается локально: `go run main.go`
- JDBC строка для SQL операций: `jdbc:postgresql://localhost:5433/ecommerce?user=ecom_user&password=ecom_password`

---

## Ключевые технические решения

### Backend
- **JSONB конвертация:** через PGobject (не String) — Spring Data JDBC + PostgreSQL
- **OperationConfig полиморфизм:** @JsonTypeInfo по полю "type" — Jackson сам выбирает класс
- **SQL операции:** DriverManager.getConnection() — динамические подключения к любой БД
- **StepResult.failure():** два overload — с responseSnapshot (для assertion) и без (для исключений)
- **Auth заглушка:** DevContext бин, заменится на SecurityContext позже
- **Нет Flyway:** отключён (flyway.enabled: false), схема создаётся вручную

### Frontend
- **Серверный стейт:** TanStack Query, query keys иерархичные (`['operations'] → ['operations', id] → ['operations', id, 'executions']`)
- **Dirty tracking:** computed state — JSON.stringify сравнение с savedSnapshot (edit page)
- **Header editor:** локальный state + internalEdit ref guard (предотвращение useEffect feedback loop)
- **Валидация:** Zod discriminated union + inline FieldError компоненты
- **Toast:** React context + portal, auto-dismiss 4s, wired в все мутации (save/delete/execute)
- **Error boundaries:** на уровне каждого route в router.tsx
- **Responsive drawer:** pointer events для resize, min 480px → max 75% viewport

---

## UX-паттерны фронтенда

- **Operations list:** фильтр-пилы по типу + поиск по имени + сортировка по колонкам + пагинация (10/25/50/100)
- **Quick Run drawer:** запуск операции прямо из списка без перехода на страницу редактирования
- **Edit page:** Save & Run (автосохранение если dirty, потом execute), unsaved индикатор
- **Execution panel:** Result/History табы, resizable (120–600px drag)
- **Inline confirm:** portal-based popover вместо browser confirm() для удаления
- **Assertion results:** expression + comparator + expected → actual + passed/failed badge

---

## Реализованные эндпоинты

```
POST   /api/operations                    — создать операцию
GET    /api/operations                    — список операций (без поиска/фильтра — всё на клиенте)
GET    /api/operations/{id}               — операция по ID
PUT    /api/operations/{id}               — обновить операцию
DELETE /api/operations/{id}               — удалить операцию
POST   /api/operations/{id}/execute       — запустить операцию (instant)
GET    /api/operations/{id}/executions    — история запусков операции (полные данные)
```

---

## Что предстоит (по спеке)

### Следующий этап — flow_module расширение
- `flows` — CRUD флоу
- `flow_steps` — шаги флоу (LINKED/DETACHED операции, вложенные флоу)
- `extraction_rules` — правила извлечения значений из ответов

### После — environment_module
- `environments` + `env_variables` CRUD
- Подстановка переменных окружения в context при запуске

### После — execution_module расширение
- Flow execution — последовательный запуск шагов с RuntimeContext
- Batch execution — параллельный запуск нескольких флоу
- SSE прогресс — `/api/executions/{id}/stream`

### Auth модуль (последним)
- Регистрация / логин / JWT
- Замена DevContext на SecurityContext везде

### Frontend backlog
- Серверная пагинация/поиск операций (когда данных станет много)
- Страницы Flows, Environments, Executions (sidebar пока disabled)
- Мобильная адаптивность
- Optimistic updates для мутаций
