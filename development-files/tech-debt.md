# Technical Debt & Roadmap

Ordered by when each item needs to land. Done items kept for reference.

---

## ✅ Done

### SSE Execution Progress ✅

Async execution for flows and operations (`POST /runs` → 202 + runId), SSE stream `GET /api/executions/{runId}/stream` with `step-completed` + `run-completed` events. Batch SSE: `GET /api/batches/{batchId}/runs/{runId}/stream` with `item-completed` + `run-completed`. Frontend fully migrated — all three pages (operations, flows, batch) use SSE, polling removed.

### Executions Page ✅

`/executions` route with unified history across all operations, flows, and batches. Filterable by type and status, paginated.

### Operation Groups (Catalog Organization) ✅

Full CRUD for groups. `group_id` FK on `operations`. Catalog page shows group column, group filter select, and inline groups manager. Operation form has group selector.

---

## Before Alpha — must land before any real deployment

### Deployment Configuration

**Files:** `application.yaml`, no `application-prod.yaml` exists

**What:** DB URL, username, and password are hardcoded in `application.yaml`. `flyway.enabled: false`. No production profile.

**Fix:** Add `application-prod.yaml` with env-variable substitution (`${DB_URL}`, `${DB_USER}`, `${DB_PASS}`). Enable Flyway for prod. Document required env vars in README.

---

### Mock Stand (One-Command Setup)

**Files:** `docker-compose.mock.yml`, `mock-api/main.go`

**What:** `docker-compose.mock.yml` only spins up Postgres. The mock API lives separately and hardcodes `localhost:5433` in `main.go`. No single command brings up a full working environment for demos or self-testing.

**Fix:** Add the mock API as a service in `docker-compose.mock.yml`. Parameterize the DB address in `main.go` via env var. Verify `docker compose -f docker-compose.mock.yml up` starts everything needed to run the app end-to-end.

---

## On Alpha — address during early usage phase

### SSE Polling Optimization

**Files:** `execution/stream/ExecutionStreamService.java`, `batch/run/BatchRunStreamService.java`, `execution/flow/FlowExecutionService.java`, `execution/InstantExecutionService.java`

**What:** SSE is implemented via DB polling every 300ms. Async jobs start with `Thread.ofVirtual().start(...)` — no bounded executor, no backpressure.

**Future:** Introduce a bounded `ExecutorService` with a configured thread pool for async execution. Add backpressure or a simple task queue before scaling to multi-user load.

---

### Unified Executions — Backend Aggregation

**Files:** `hooks/use-all-executions.ts`

**What:** The executions page fans out to all entity endpoints individually from the frontend. As data volume grows this will be the first thing that gets noisy.

**Future:** Add a backend `GET /api/executions` endpoint that returns a unified, paginated list across flows, operations, and batches, filterable by type/status. Replace the frontend fan-out with a single query.

---

### Tests

**What:** Backend has only the Spring Boot context test. No service or integration tests. No frontend tests at all.

**Future:** Backend: integration tests for at least the execution and batch paths against a real Postgres (Testcontainers). Frontend: component tests for the flow editor and execution stream hook.

---

## After Alpha — post-launch, when auth becomes necessary

### Auth & Multi-Tenancy

**Files:** `shared/TenantContext.java`, `shared/DevContext.java`

**What:** `DevContext` always returns a hardcoded owner UUID. No authentication, no user accounts, no isolation between users.

**Future:** Replace `DevContext` with JWT-based `TenantContext`. Add `findByIdAndOwnerId` variants in all repositories. Consider object-level ACLs (share a flow with another user, read-only vs edit).

---

### Tenant Isolation in findById

**Files:** `EnvironmentService`, `FlowService`, `OperationService`, `BatchService`

**What:** `findById(UUID id)` queries by ID only, without filtering by `ownerId`. Resolves alongside the Auth item above.

---

### Secret Variables

**Files:** `EnvVariable.java`, `EnvironmentService.java`, environments frontend

**What:** Environment variables (API keys, passwords, DB credentials) are stored and returned as plain text.

**Future:** Encrypt sensitive values at-rest using AES-GCM with a master key from config. Add a `secret: boolean` flag to `EnvVariable`. Secret values are encrypted on write, decrypted on use, never returned in GET responses (masked as `"***"`).

---

### SSL Certificate Verification

**File:** `HttpOperationExecutor.java` — `buildTrustAllSslContext()`

**What:** All HTTPS requests skip certificate validation (trust-all `X509TrustManager`).

**Future:** Make it a per-operation toggle (`skipSslVerification: true/false`). Default to `false` (strict) once the UI supports it.

---

## Backend — Engineering Improvements

Items below have no user-facing urgency but improve correctness, observability, and code clarity. Implement opportunistically.

---

### MDC + traceId в логах

**Files:** `execution/flow/FlowExecutionService.java`, `execution/InstantExecutionService.java`, `batch/run/BatchRunService.java`

**What:** Все execution-логи пишутся без correlation ID. При параллельных запросах в логах невозможно отследить какая строка к какому запуску относится.

**Fix:** В начале `execute()` и `runAsync()` писать `MDC.put("executionRunId", run.getId().toString())`, в `finally` — `MDC.clear()`. Добавить `%X{executionRunId}` в паттерн логгера в `application.yaml`. Virtual threads требуют явного `MDC.clear()` — контекст не очищается автоматически при завершении потока.

---

### Strategy реестр для OperationExecutor

**Files:** `execution/flow/FlowExecutionService.java`, `execution/InstantExecutionService.java`

**What:** Выбор исполнителя делается через `executors.stream().filter(e -> e.supports(...)).findFirst()` — линейный поиск по списку при каждом шаге каждого execution.

**Fix:** Завести `Map<OperationType, OperationExecutor>` как `@Bean`, собрать через `@Autowired List<OperationExecutor>` в конструкторе. Lookup становится O(1) и явным — сразу видно что для каждого типа ровно один исполнитель.

---

### Spring Events для межмодульного оповещения

**Files:** `execution/flow/FlowExecutionService.java`, `shared/`

**What:** По завершении execution нет никакого события — сервисы которые хотят реагировать (будущая статистика, нотификации, метрики) должны встраиваться прямо в FlowExecutionService.

**Fix:** Опубликовать `FlowExecutionCompletedEvent` через `ApplicationEventPublisher` в конце `execute()`. Слушатель регистрируется через `@EventListener` в отдельном компоненте. Модули не знают друг о друге — классический Observer через Spring.

---

### AOP аспект для аудита execution-запросов

**Files:** `execution/flow/FlowExecutionController.java`, `execution/InstantExecutionController.java`, новый `shared/audit/`

**What:** Нет централизованного логирования входящих execution-запросов: кто, что, когда.

**Fix:** Аннотация `@AuditExecution` + аспект `@Around` на контроллерах. Аспект логирует `ownerId`, `flowId`/`operationId`, время ответа, статус. Никакой бизнес-логики в аспекте — только observability.

---

### @Version — оптимистичная блокировка

**Files:** `flow/Flow.java`, `catalog/Operation.java`

**What:** Два одновременных запроса на редактирование одного flow молча перезаписывают друг друга — last write wins.

**Fix:** Добавить поле `@Version private Long version` на `Flow` и `Operation`. Spring Data JDBC поддерживает это нативно — при конфликте бросает `OptimisticLockingFailureException`, которую `GlobalExceptionHandler` маппит в 409. Добавить колонку `version BIGINT DEFAULT 0` в `db/init.sql`.

---

### CompletableFuture для параллельного batch-выполнения

**Files:** `batch/run/BatchRunService.java`

**What:** Batch в режиме `MULTI` запускает items последовательно в одном потоке. 10 items × 500ms каждый = 5 секунд вместо 500ms.

**Fix:** Для `MULTI`-батчей собрать `List<CompletableFuture<Void>>`, запустить через `Executors.newVirtualThreadPerTaskExecutor()`, дождаться через `CompletableFuture.allOf(...)`. `DATA_DRIVEN` оставить последовательным — там порядок строк важен.

---

### N+1 в JDBC — FlowStepService + ExtractionRuleService

**Files:** `flow/compiler/FlowCompiler.java`

**What:** `compileRecursive` для каждого шага делает отдельный запрос за `ExtractionRule` через `extractionRuleService.getRulesByStepId(stepId)` — N+1 по числу шагов в flow.

**Fix:** Добавить в `ExtractionRuleRepository` метод `findAllByFlowStepIdIn(Collection<UUID> stepIds)`. В `FlowCompiler` собрать все `stepId` за один проход, загрузить все правила одним запросом, раздать по шагам через `Map<UUID, List<ExtractionRule>>`. После внедрения кэша это менее критично, но правильный подход стоит зафиксировать.
