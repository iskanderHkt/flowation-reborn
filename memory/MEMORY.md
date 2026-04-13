---
name: Flowation Reborn — полный контекст проекта
description: No-code API testing platform. Полная архитектура, стек, модули, DB schema, REST API endpoints, состояние реализации, roadmap.
type: project
---

## Что такое Flowation

Платформа тестовой автоматизации API без написания кода. Пользователь собирает тесты из готовых блоков (операций), запускает их и видит результат в реальном времени.

**Сущности:**
- **Операция** — атомарный шаг: HTTP-запрос, SQL-запрос, или Assert-проверка
- **Флоу** — упорядоченная цепочка шагов (операций и вложенных флоу), до 10 уровней вложенности
- **Окружение** — именованный набор key-value переменных (base_url, api_key и т.д.), подставляется через `{{variable}}` синтаксис
- **Батч** — параллельный запуск нескольких флоу одной кнопкой (ещё не реализован)

**Why:** Переписывание с распределённой системы (Java API + Go worker + RabbitMQ + Redis + Postgres) на модульный монолит — один бэкенд-процесс, одна внешняя зависимость (Postgres). Solo-разработка, распределённая система была чрезмерной.

---

## Стек технологий

### Backend
- **Spring Boot 4.0.4**, Java 21, Maven (mvnw)
- **Spring Data JDBC** (не JPA) — entities с @Table, CrudRepository, NamedParameterJdbcTemplate
- **Flyway** — настроен в зависимостях, но `spring.flyway.enabled: false` (схема через init.sql)
- **PostgreSQL 16** — единственная внешняя зависимость
- **Lombok** — @Data, @Builder, @RequiredArgsConstructor повсюду
- **Jackson** — JSON сериализация, @JsonTypeInfo/@JsonSubTypes для OperationConfig полиморфизма
- **springdoc-openapi** 3.0.2 — Swagger UI
- **mysql-connector-j** (runtime) — для SQL операций, которые тестируют MySQL базы
- Порт: **2121**
- Base package: `kg.ademity.flowation_api_modulith`

### Frontend
- **React 19.2** + **TypeScript 5.9**
- **Vite 8** + **@vitejs/plugin-react 6** + **React Compiler** (babel-plugin-react-compiler 1.0)
- **Tailwind CSS v4** (@tailwindcss/vite)
- **TanStack Router** (file-based routing) + **TanStack Query** (react-query v5)
- **@xyflow/react 12** (ReactFlow) — визуальный flow editor canvas
- **CodeMirror 6** — JSON и SQL редакторы
- **ky** — HTTP-клиент (обёртка над fetch)
- **Zustand** — state management
- **Zod** — валидация (доступен, но не факт что активно используется)
- **lucide-react** — иконки
- **class-variance-authority + clsx + tailwind-merge** — утилиты стилей
- Path alias: `@/` → `src/`
- Порт: **2122**, proxy `/api` → `localhost:2121`

### Инфраструктура
- **docker-compose.yml** — Postgres для Flowation (порт 4321→5432, db: flowation-db, user: fw_user)
- **docker-compose.mock.yml** — Mock ecommerce Postgres (порт 5433→5432, db: ecommerce, user: ecom_user) + Go API (порт 8081) для smoke-тестирования
- DB schema — `db/init.sql` (используется как Docker entrypoint init script)

---

## Архитектура backend

### Модульная структура (пакеты, НЕ Maven-модули)

```
kg.ademity.flowation_api_modulith
├── flow_module/
│   ├── operation/              — Operation CRUD (entity, service, controller, repository, DTOs)
│   │   ├── config/             — OperationConfig sealed interface + HttpOperationConfig, SqlOperationConfig, AssertOperationConfig
│   │   └── dto/request/        — OperationCreateRequest, OperationUpdateRequest (records)
│   ├── flow/                   — Flow CRUD
│   │   ├── dto/request/        — FlowCreateRequest, FlowUpdateRequest
│   │   └── step/               — FlowStep CRUD
│   │       ├── dto/request/    — FlowStepCreateRequest, FlowStepUpdateRequest, ReorderEntry
│   │       ├── dto/response/
│   │       └── extraction/     — ExtractionRule CRUD (controller, service, repository)
│   │           └── dto/request/
│   └── compiler/               — FlowCompiler, CompiledStep, FlowCompilationException
├── execution_module/
│   ├── executor/               — OperationExecutor<T> interface + HttpOperationExecutor, SqlOperationExecutor, AssertOperationExecutor
│   │                             VariableResolver, StepResult
│   ├── flow/                   — FlowExecutionController, FlowExecutionService, JsonPathExtractor
│   ├── run/                    — ExecutionRun, ExecutionStepResult entities + repositories
│   ├── dto/                    — ExecutionResultResponse, FlowExecutionResultResponse, StepResultResponse
│   ├── exception/              — StepExecutionException
│   ├── InstantExecutionController, InstantExecutionService
│   └── AbsentValue             — sentinel для extraction rules, когда JSONPath не нашёл значение
├── environment_module/
│   ├── Environment, EnvVariable entities
│   ├── EnvironmentRepository, EnvVariableRepository
│   ├── EnvironmentController, EnvironmentService
│   └── dto/                    — EnvironmentCreateRequest, EnvironmentUpdateRequest, UpsertVariablesRequest, EnvironmentResponse
└── shared/
    ├── TenantContext (interface) → DevContext (заглушка, всегда DEV_USER_ID)
    ├── JacksonConfig
    ├── exception/              — FlowationException, NotFoundException, ValidationException
    └── jdbc/                   — Custom read/write converters для Spring Data JDBC:
                                  OperationConfigReadConverter, OperationConfigWriteConverter (JSONB ↔ OperationConfig)
                                  JsonMapReadConverter, JsonMapWriteConverter (JSONB ↔ Map)
                                  JdbcConvertersConfig
```

### Ключевые паттерны

1. **OperationConfig полиморфизм:**
   - `sealed interface OperationConfig permits HttpOperationConfig, SqlOperationConfig, AssertOperationConfig`
   - Jackson: `@JsonTypeInfo(use=Id.NAME, property="type")` + `@JsonSubTypes`
   - Дискриминатор: `type` поле: `HTTP_REQUEST`, `SQL_QUERY`, `ASSERTION`
   - `OperationConfig.merge(base, override)` — мержит LINKED step override поверх template

2. **TenantContext / DevContext:**
   - `TenantContext` — интерфейс с `getOwnerId()`
   - `DevContext` — заглушка, всегда `00000000-0000-0000-0000-000000000001`
   - Auth модуль ещё не реализован; после реализации DevContext заменится на JWT-based implementation

3. **Flow Compilation:**
   - `FlowCompiler.compile(Flow)` рекурсивно разворачивает вложенные FLOW_STEPs в плоский `List<CompiledStep>`
   - Глубина ограничена `flowation.execution.max-nesting-depth` (default 10)
   - Каждый CompiledStep содержит: stepIndex, stepRefId, operationName, operationType, mergedConfig, onFail, extractionRules

4. **Execution pipeline (FlowExecutionService):**
   - Компиляция flow → flat list
   - Создание ExecutionRun (status=RUNNING)
   - Загрузка environment → seeding runtimeContext
   - Последовательное выполнение: executor.executeRaw() → save StepResult → apply extraction rules → runtimeContext
   - OnFail: STOP_FLOW → mark remaining as SKIPPED; SKIP_AND_CONTINUE → loop continues, overall status = FAILED
   - Финализация run (status = COMPLETED|FAILED)

5. **VariableResolver:**
   - Pattern: `{{varName}}` → lookup in runtimeContext Map
   - Throws if variable not found or is AbsentValue

6. **JsonPathExtractor:**
   - Минимальная реализация: `$.body.token`, `$.rows[0].id`, `$.rowCount`
   - Dot-notation, array indexing `[n]`

7. **OperationExecutor<T> strategy pattern:**
   - `supports(OperationType)` + `execute(T config, Map context)`
   - `executeRaw()` default method with unchecked cast
   - HttpOperationExecutor: JDK HttpClient, trust-all SSL, VariableResolver on url/body
   - SqlOperationExecutor: JDBC DriverManager, supports SELECT (rows) and DML (affectedRows)
   - AssertOperationExecutor: EQ, NEQ, CONTAINS, REGEX, GT, LT, IS_NULL, IS_NOT_NULL

---

## REST API Endpoints

### Operations (flow_module)
- `GET    /api/operations` — list all (filtered by ownerId)
- `GET    /api/operations/{id}` — get by id
- `POST   /api/operations` — create (body: {name, config})
- `PUT    /api/operations/{id}` — update
- `DELETE /api/operations/{id}` — delete (blocked if LINKED in flows)

### Operation Execution (execution_module)
- `POST   /api/operations/{id}/execute?environmentId=` — instant execute
- `GET    /api/operations/{id}/executions` — execution history

### Flows (flow_module)
- `GET    /api/flows` — list all
- `GET    /api/flows/{id}` — get by id
- `POST   /api/flows` — create (body: {name, description})
- `PUT    /api/flows/{id}` — update
- `DELETE /api/flows/{id}` — delete

### Flow Steps (flow_module)
- `GET    /api/flows/{flowId}/steps` — list steps
- `GET    /api/flows/{flowId}/steps/{stepId}` — get step
- `POST   /api/flows/{flowId}/steps` — add step (auto stepOrder = last+1)
- `PUT    /api/flows/{flowId}/steps/{stepId}` — update step
- `DELETE /api/flows/{flowId}/steps/{stepId}` — delete step (auto reorder)
- `PUT    /api/flows/{flowId}/steps/reorder` — bulk reorder (body: [{stepId, newOrder}])

### Extraction Rules (flow_module)
- `GET    /api/flows/{flowId}/steps/{stepId}/rules` — list rules
- `POST   /api/flows/{flowId}/steps/{stepId}/rules` — add rule
- `PUT    /api/flows/{flowId}/steps/{stepId}/rules/{ruleId}` — update rule
- `DELETE /api/flows/{flowId}/steps/{stepId}/rules/{ruleId}` — delete rule

### Flow Execution (execution_module)
- `POST   /api/flows/{id}/execute?environmentId=` — execute flow
- `GET    /api/flows/{id}/executions` — execution history
- `POST   /api/flows/{flowId}/steps/{stepId}/test` — test single step (no persist)

### Environments (environment_module)
- `GET    /api/environments` — list all
- `GET    /api/environments/{id}` — get by id
- `POST   /api/environments` — create (body: {name})
- `PUT    /api/environments/{id}` — update name
- `DELETE /api/environments/{id}` — delete
- `PUT    /api/environments/{id}/variables` — upsert variables (replace-all strategy)

---

## Database Schema

8 таблиц, 5 контекстов:

**Identity:** `users` (dev user с hardcoded UUID)
**OperationCatalog:** `operation_groups` (зарезервирована, пока пуста) + `operations` (JSONB config_template)
**Flow:** `flows` + `flow_steps` (LINKED/DETACHED binding, OPERATION_STEP/FLOW_STEP kind, on_fail strategy) + `extraction_rules`
**Environment:** `environments` + `env_variables` (key-value, unique per env)
**Execution:** `execution_runs` (JSONB execution_plan snapshot) + `execution_step_results` (step_ref_id без FK — намеренно)

Ключевые constraints в flow_steps: chk_step_kind, chk_linked_or_detached.

---

## Frontend — архитектура UI

### Routing (TanStack Router)
- `/` → redirect → `/operations`
- `/operations` — Operations list
- `/operations/new` — New operation form
- `/operations/$operationId` — Edit operation + instant execution panel
- `/flows` — Flows list
- `/flows/new` — New flow form
- `/flows/$flowId` — Flow editor (canvas + panels)
- `/environments` — Environments list
- `/environments/new` — New environment form
- `/environments/$environmentId` — Edit environment + variables editor

### Layout
- Sidebar (collapsible, 4 nav items: Operations, Flows, Environments, Executions[disabled])
- Main content area с `<Outlet />`

### API Layer
- `api/client.ts` — ky instance (prefixUrl: `/api`, timeout: 30s)
- `api/operations.ts` — operationsApi object
- `api/flows.ts` — flowsApi object (flows + steps + rules + execution)
- `api/environments.ts` — environmentsApi object
- `api/types.ts` — полные TypeScript типы всех сущностей и request/response моделей
- `api/validation.ts` — валидация

### Hooks
- `hooks/use-operations.ts` — TanStack Query hooks для operations
- `hooks/use-flows.ts` — TanStack Query hooks для flows, steps, rules, execution + `useMultipleFlowSteps` для batch fetch вложенных флоу
- `hooks/use-environments.ts` — TanStack Query hooks
- `hooks/use-sort.ts`, `hooks/use-pagination.ts` — utility hooks

### UI Components
- `components/ui/` — дизайн-система: button, input, select, badge, spinner, tabs, toast, confirm-popover (CSS variables, cva)
- `components/layout.tsx` — Sidebar + Outlet
- `components/sidebar.tsx` — navigation
- `components/operation-form.tsx` — форма операции (HTTP/SQL/Assert)
- `components/key-value-editor.tsx` — key-value редактор (для headers, env variables)
- `components/code-editor.tsx` — CodeMirror wrapper (JSON, SQL)
- `components/execution-panel.tsx` — панель instant execution для операций
- `components/quick-run-drawer.tsx`
- `components/resize-handle.tsx`
- `components/error-boundary.tsx`

### Flow Editor
- `components/flow-editor/flow-canvas.tsx` — ReactFlow canvas (OperationStepNode, FlowStepNode, AddStepNode), layout (NODE_X + yOffset)
- `components/flow-editor/operation-step-node.tsx` — нода для OPERATION_STEP (3px accent bar для sub-flow children)
- `components/flow-editor/flow-step-node.tsx` — нода для FLOW_STEP (expand/collapse sub-flow)
- `components/flow-editor/add-step-node.tsx` — нода "+" для добавления шага
- `components/flow-editor/add-step-dialog.tsx` — диалог выбора операции/флоу для нового шага
- `components/flow-editor/step-properties-panel.tsx` — правая панель свойств выбранного шага
- `components/flow-editor/flow-execution-panel.tsx` — панель выполнения флоу
- `components/flow-editor/extraction-rules-editor.tsx` — CRUD extraction rules
- `components/flow-editor/response-variable-picker.tsx` — UI для выбора переменных из ответа
- `components/flow-editor/flow-variables-panel.tsx` — панель переменных флоу

### Execution Result Views
- `components/execution/status-badge.tsx` — бейдж статуса (COMPLETED/FAILED/etc)
- `components/execution/http-result-view.tsx` — визуализация HTTP request/response
- `components/execution/sql-result-view.tsx` + `sql-table.tsx` — визуализация SQL результатов
- `components/execution/assert-result-view.tsx` — визуализация assert результатов
- `components/execution/result-view.tsx` — роутер по типу операции
- `components/execution/history-list.tsx` — список execution history
- `components/execution/collapsible.tsx` — collapse/expand wrapper

---

## Mock Ecommerce (для тестирования)

Отдельный Go-сервис (`mock-ecommerce/main.go`) для smoke-тестов Flowation:
- **Port:** 8081
- **DB:** Postgres на порту 5433 (docker-compose.mock.yml)
- **Endpoints:** GET/POST /products, GET /products/:id, GET/POST /orders
- **Seed data:** 5 продуктов (Laptop Pro 15, Wireless Mouse, USB-C Hub, Mechanical Keyboard, Monitor 27")
- Используется для демонстрации и тестирования HTTP и SQL операций Flowation

---

## Текущее состояние (2026-04-13)

### Реализовано полностью
- CRUD операций (HTTP_REQUEST, SQL_QUERY, ASSERTION)
- Instant execution с поддержкой environments
- Flow module: CRUD flows, flow_steps, extraction_rules
- Flow steps: LINKED/DETACHED binding, OPERATION_STEP/FLOW_STEP kind, on_fail strategy
- Вложенные флоу: cycle detection (DFS path-based), depth validation
- Flow compilation: рекурсивное разворачивание в плоский список
- Flow execution: полный pipeline с env variables, extraction rules, nested flows
- Environments module: CRUD + upsertVariables (replace-all strategy)
- Flow editor UI: ReactFlow canvas, properties panel, execution panel
- Rich result views: HTTP (request/response), SQL (table), Assert (passed/failed)
- Inline sub-flow expansion: кнопка на FlowStepNode раскрывает шаги вложенного флоу inline на canvas
- Quick run drawer, history list, status badges
- Mock ecommerce service

### Не реализовано (Roadmap)
- **Auth module** — JWT аутентификация (замена DevContext заглушки): регистрация, логин, auto-refresh token
- **Batch execution** — параллельный запуск нескольких флоу, агрегация результатов
- **SSE progress** — real-time прогресс для long-running execution
- **Operation groups** — таблица operation_groups создана, но функциональность не реализована
- **Executions page** — пункт в sidebar есть (disabled), страница не реализована
- **Soft delete** — operations/flows удаляются жёстко
- **Secret variables** — env_variables хранятся в открытом виде
