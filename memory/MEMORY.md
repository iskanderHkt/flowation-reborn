---
name: Flowation Reborn — полный контекст проекта
description: No-code API testing platform. Полная архитектура, стек, модули, DB schema, REST API endpoints, состояние реализации, roadmap.
type: project
---

## Что такое Flowation

Платформа тестовой автоматизации API без написания кода. Пользователь собирает тесты из готовых блоков (операций), запускает их и видит результат.

**Сущности:**
- **Операция** — атомарный шаг: HTTP-запрос, SQL-запрос, или Assert-проверка
- **Флоу** — упорядоченная цепочка шагов (операций и вложенных флоу), до 10 уровней вложенности
- **Окружение** — именованный набор key-value переменных (base_url, api_key и т.д.), подставляется через `{{variable}}` синтаксис
- **Батч** — параллельный запуск нескольких флоу/операций (MULTI) или одного флоу/операции с разными наборами данных (DATA_DRIVEN)

**Why:** Переписывание с распределённой системы (Java API + Go worker + RabbitMQ + Redis + Postgres) на модульный монолит — один бэкенд-процесс, одна внешняя зависимость (Postgres). Solo-разработка.

---

## Стек технологий

### Backend
- **Spring Boot 4.0.4**, Java 21, Maven (mvnw)
- **Spring Data JDBC** (не JPA) — entities с @Table, CrudRepository
- **Flyway** — настроен, но `spring.flyway.enabled: false` (схема через init.sql)
- **PostgreSQL 16** — единственная внешняя зависимость
- **Lombok** — @Data, @Builder, @RequiredArgsConstructor повсюду
- **Jackson** — JSON сериализация, @JsonTypeInfo/@JsonSubTypes для OperationConfig полиморфизма
- **Virtual Threads** — `spring.threads.virtual.enabled: true`
- Порт: **2121**
- Base package: `kg.ademity.flowation_api_modulith`

### Frontend
- **React 19.2** + **TypeScript 5.9**
- **Vite 8** + **@vitejs/plugin-react 6** + **React Compiler**
- **Tailwind CSS v4**
- **TanStack Router** (manual route registration) + **TanStack Query v5**
- **@xyflow/react 12** (ReactFlow) — flow editor canvas
- **CodeMirror 6** — JSON и SQL редакторы
- **ky** — HTTP-клиент
- Path alias: `@/` → `src/`
- Порт: **2122**, proxy `/api` → `localhost:2121`

### Инфраструктура
- **docker-compose.yml** — Postgres для Flowation (порт 4321→5432)
- **docker-compose.mock.yml** — Mock ecommerce Postgres (порт 5433) + Go API (порт 8081)
- DB schema — `db/init.sql`
- **development-files/tech-debt.md** — технический долг (SSL cert verification, tenant isolation)

---

## Архитектура backend

### Модульная структура

```
kg.ademity.flowation_api_modulith
├── catalog/                        — Operations CRUD
│   ├── config/                     — OperationConfig sealed interface + Http/Sql/AssertOperationConfig
│   ├── adapter/                    — OperationPortAdapter, OperationUsageAdapter
│   └── port/                       — OperationUsagePort (interface)
├── flow/                           — Flows, FlowSteps, ExtractionRules, FlowCompiler
│   ├── step/extraction/            — ExtractionRule CRUD
│   ├── compiler/                   — FlowCompiler, CompiledStep, FlowCompilationException
│   └── adapter/                    — FlowPlanAdapter, OperationUsageAdapter
├── execution/                      — Execution pipeline
│   ├── executor/                   — OperationExecutor<T> + Http/Sql/Assert, StepResult, VariableResolver
│   ├── flow/                       — FlowExecutionController, FlowExecutionService, JsonPathExtractor
│   ├── run/                        — ExecutionRun, ExecutionStepResult entities + repositories
│   │                                 RunMode: INSTANT | FLOW | BATCH
│   │                                 ExecutionStatus: PENDING | RUNNING | COMPLETED | FAILED | SKIPPED
│   ├── port/                       — OperationPort, EnvContextPort, FlowPlanPort
│   ├── adapter/                    — FlowExecutionAdapter, OperationExecutionAdapter
│   ├── dto/                        — ExecutionResultResponse, FlowExecutionResultResponse, StepResultResponse
│   └── InstantExecutionController, InstantExecutionService
├── batch/                          — Batch execution (полностью реализован)
│   ├── port/                       — FlowExecutionPort, OperationExecutionPort (межмодульный контракт)
│   ├── run/                        — BatchRun, BatchRunService, BatchRunController, BatchRunRepository
│   │   └── dto/                    — BatchRunResponse, BatchRunItemResult
│   ├── dto/                        — BatchCreateRequest, SetBatchItemsRequest, SetBatchDataRowsRequest, BatchResponse
│   ├── BatchService, BatchController, BatchExecutorConfig (virtual thread pool, size=10)
│   └── Batch, BatchItem, BatchDataRow entities + repositories
├── environment/
│   ├── adapter/                    — EnvContextAdapter (реализует EnvContextPort)
│   └── Environment, EnvVariable, EnvironmentService, EnvironmentController
└── shared/
    ├── TenantContext (interface) → DevContext (заглушка, DEV_USER_ID)
    ├── PageResult<T>               — пагинированный ответ { content, total, page, size }
    ├── JacksonConfig, GlobalExceptionHandler
    └── exception/                  — FlowationException, NotFoundException, ValidationException
```

### Ключевые паттерны

1. **Ports & Adapters (межмодульный контракт)** — модули не импортируют друг друга напрямую, только через интерфейсы-порты

2. **OperationConfig полиморфизм** — `sealed interface`, дискриминатор `type`: `HTTP_REQUEST`, `SQL_QUERY`, `ASSERTION`. `OperationConfig.merge(base, override)` для LINKED step overrides

3. **Batch execution:**
   - `BatchMode.MULTI` — N разных флоу/операций, каждый запускается один раз параллельно
   - `BatchMode.DATA_DRIVEN` — один флоу/операция × N строк датасета (каждая строка = набор inputVariables)
   - Запуск: `POST /batches/{id}/runs` → 202 Accepted + runId; статус `GET /batches/{id}/runs/{runId}`
   - `BatchRunStatus`: PENDING → RUNNING → COMPLETED | PARTIAL | FAILED
   - `ExecutionRun.batchGroupId` связывает отдельные execution_runs с batch_run
   - Async через `CompletableFuture.supplyAsync()` на virtual thread pool (10 потоков)
   - Переменные: env variables как база → inputVariables (строка датасета) поверх

4. **Пагинация истории выполнений:**
   - `GET /operations/{id}/executions?page=0&size=20`
   - `GET /flows/{id}/executions?page=0&size=20`
   - `GET /batches/{id}/runs?page=0&size=20`
   - Ответ: `PageResult<T> { content, total, page, size }`

5. **FlowCompiler:**
   - Рекурсивно разворачивает вложенные FLOW_STEPs в плоский `List<CompiledStep>`
   - Глубина ограничена `flowation.execution.max-nesting-depth` (default 10)
   - Для LINKED шагов Operation грузится один раз (и для config, и для name) — без N+1

6. **Execution pipeline (FlowExecutionService):**
   - compilePlan → create ExecutionRun → load env context → sequential step loop
   - OnFail: STOP_FLOW / SKIP_AND_CONTINUE
   - Extraction rules → пишут в runtimeContext после каждого успешного шага
   - finally: всегда финализирует run (COMPLETED|FAILED), сохраняет мутацией существующего объекта

7. **HttpOperationExecutor** — trust-all SSL (намеренно, для dev/staging окружений). HTTP 4xx/5xx → `StepResult.success()` — статус проверяется через ASSERTION шаг отдельно

---

## REST API Endpoints

### Operations
- `GET/POST   /api/operations`
- `GET/PUT/DELETE /api/operations/{id}`
- `POST  /api/operations/{id}/execute?environmentId=`
- `GET   /api/operations/{id}/executions?page=0&size=20` → `PageResult<ExecutionResultResponse>`

### Flows
- `GET/POST  /api/flows`
- `GET/PUT/DELETE /api/flows/{id}`
- `GET/POST  /api/flows/{flowId}/steps`
- `GET/PUT/DELETE /api/flows/{flowId}/steps/{stepId}`
- `PUT   /api/flows/{flowId}/steps/reorder`
- `GET/POST /api/flows/{flowId}/steps/{stepId}/rules`
- `PUT/DELETE /api/flows/{flowId}/steps/{stepId}/rules/{ruleId}`
- `POST  /api/flows/{id}/execute?environmentId=`
- `GET   /api/flows/{id}/executions?page=0&size=20` → `PageResult<FlowExecutionResultResponse>`
- `POST  /api/flows/{flowId}/steps/{stepId}/test` — тест одного шага без сохранения

### Environments
- `GET/POST  /api/environments`
- `GET/PUT/DELETE /api/environments/{id}`
- `PUT   /api/environments/{id}/variables`

### Batches
- `GET/POST  /api/batches`
- `GET/PUT/DELETE /api/batches/{id}`
- `PUT   /api/batches/{id}/items` — replace-all список айтемов
- `PUT   /api/batches/{id}/data-rows` — replace-all датасет
- `POST  /api/batches/{id}/runs` → 202 + `{ runId, batchId }`
- `GET   /api/batches/{id}/runs?page=0&size=20` → `PageResult<BatchRunResponse>`
- `GET   /api/batches/{id}/runs/{runId}`
- `GET   /api/batches/{id}/runs/{runId}/stream` → SSE: `item-completed` + `run-completed`

---

## Database Schema (13 таблиц)

**Identity:** `users`
**OperationCatalog:** `operation_groups` (зарезервирована) + `operations` (JSONB config_template)
**Flow:** `flows` + `flow_steps` (LINKED/DETACHED, OPERATION_STEP/FLOW_STEP, on_fail) + `extraction_rules`
**Environment:** `environments` + `env_variables`
**Execution:** `execution_runs` (JSONB execution_plan, batch_group_id UUID) + `execution_step_results`
**Batch:** `batches` (mode: MULTI|DATA_DRIVEN) + `batch_items` (soft ref к flow/operation) + `batch_data_rows` (JSONB variables) + `batch_runs`

---

## Frontend — архитектура UI

### Routing
- `/` → redirect → `/catalog`
- `/catalog`, `/catalog/new`, `/catalog/$operationId`
- `/flows`, `/flows/new`, `/flows/$flowId`
- `/environments`, `/environments/new`, `/environments/$environmentId`
- `/batch`, `/batch/new`, `/batch/$batchId`

### Sidebar nav items
- Flows, Catalog, Environments, Batch (все активны)

### API Layer
- `api/client.ts` — ky instance
- `api/operations.ts`, `api/flows.ts`, `api/environments.ts`, `api/batches.ts`
- `api/types.ts` — все TypeScript типы включая `PageResult<T>`, `Batch`, `BatchRun`, `BatchRunStatus` и т.д.

### Hooks
- `hooks/use-operations.ts`, `hooks/use-flows.ts`, `hooks/use-environments.ts`, `hooks/use-batches.ts`
- Все history-хуки принимают `page`/`size`, возвращают `PageResult<T>`

### Batch UI (routes/batch/)
- `index.tsx` — список батчей (таблица: name, mode badge, items/rows count)
- `new.tsx` — создание: name + выбор режима (MULTI / DATA_DRIVEN)
- `edit.tsx` — детальная страница:
  - Inline редактирование имени
  - MULTI: список айтемов + диалог добавления (поиск по флоу/операциям с вкладками)
  - DATA_DRIVEN: выбор одного таргета + редактор датасета (таблица с колонками-переменными)
  - Run кнопка в хедере → 202 → SSE стрим `useBatchRunStream` (заменил polling)
  - Панель результата показывает айтемы live по мере завершения каждого

---

## Технический долг (development-files/tech-debt.md)

1. **SSL cert verification** — trust-all в HttpOperationExecutor, намеренно для dev окружений. Future: per-operation флаг
2. **Tenant isolation** — findById без фильтра по ownerId во всех сервисах. Поправить когда появится auth

---

## Текущее состояние (2026-05-05)

### Реализовано полностью
- CRUD операций (HTTP_REQUEST, SQL_QUERY, ASSERTION)
- Instant execution с environments и inputVariables
- Flow module: CRUD, steps, extraction rules, compilation, execution
- Flow steps: LINKED/DETACHED, OPERATION_STEP/FLOW_STEP, on_fail, cycle detection
- Вложенные флоу с depth validation
- Environments module
- **Batch execution** — MULTI + DATA_DRIVEN, async parallel, PARTIAL статус
- Пагинация истории выполнений на всех трёх endpoint'ах
- Flow editor UI: ReactFlow canvas, properties panel, execution panel
- Rich result views: HTTP, SQL, Assert
- Batch UI: list, create, detail/edit с run panel и историей
- **SSE streaming** — все три типа (операция, флоу, батч) используют SSE вместо polling/sync
  - `GET /api/executions/{runId}/stream` — step-completed / run-completed
  - `GET /api/batches/{batchId}/runs/{runId}/stream` — item-completed / run-completed
  - Фронт: `useExecutionStream`, `useBatchRunStream` в `shared/hooks/use-execution-stream.ts`
- **Operation groups** — CRUD, фильтр в каталоге
- **Executions page** — `/executions`, unified history

### Не реализовано (Roadmap)
- **Auth module** — JWT (замена DevContext)
- **Soft delete**
- **Secret variables** — хранятся в открытом виде
- **HTTP response status → FAILED** — 4xx/5xx сейчас успешный шаг, статус проверяется assertion'ом
