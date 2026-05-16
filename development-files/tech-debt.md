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

### Strategy Registry для OperationExecutor ✅
`OperationExecutorRegistry` — `EnumMap<OperationType, OperationExecutor>`, lookup O(1). Используется в `FlowExecutionService` и `InstantExecutionService`.

### @Version — оптимистичная блокировка ✅
`@Version Long version` на `Flow` и `Operation`. `OptimisticLockingFailureException` → 409 в `GlobalExceptionHandler`. Колонка `version BIGINT DEFAULT 0` в схеме.

### CompletableFuture для параллельного batch-выполнения ✅
`BatchRunService` использует `CompletableFuture.supplyAsync()` через `batchExecutor` (`newVirtualThreadPerTaskExecutor()`). MULTI батчи выполняются параллельно. DATA_DRIVEN — последовательно (порядок строк важен).

### N+1 в FlowCompiler ✅
3-фазная компиляция: collect steps → bulk load rules (`findAllByFlowStepIdIn`) → assemble. Один запрос вместо N.

### Unit Tests — FlowCompiler ✅
3 теста: два LINKED шага, вложенный флоу, превышение maxNestingDepth.

### Integration Tests — базовая инфраструктура ✅
Testcontainers + PostgreSQL, `AbstractIntegrationTest`, Flyway миграция в test resources, `application-test.yaml`. Первый тест: `ExtractionRuleRepositoryIT`.

---

## Before Alpha — must land before any real deployment

### Mock Stand (One-Command Setup)

**Files:** `docker-compose.mock.yml`, `mock-api/main.go`

**Проблема:** `docker-compose.mock.yml` поднимает только Postgres. Mock API живёт отдельно и хардкодит `localhost:5433`. Единой команды для запуска всего окружения нет.

**Подзадачи:**
- Добавить mock API как сервис в `docker-compose.mock.yml`
- Параметризовать адрес БД в `main.go` через env var (`DB_HOST`, `DB_PORT`)
- Проверить что `docker compose -f docker-compose.mock.yml up` поднимает всё необходимое для e2e демо

---

## On Alpha — address during early usage phase

### Deployment Configuration & CI/CD

**Files:** `application.yaml`, нет `application-prod.yaml`, нет `Dockerfile`

**Проблема:** Credentials захардкожены, prod профиля нет, приложение не контейнеризовано.

**Подзадачи:**
- Создать `application-prod.yaml` с env-variable substitution (`${DB_URL}`, `${DB_USER}`, `${DB_PASS}`, `${DB_DRIVER}`)
- Включить Flyway в prod профиле (`spring.flyway.enabled: true`)
- Написать `Dockerfile` для Spring Boot приложения (multi-stage: build + runtime)
- Обновить `docker-compose.yml` — добавить сервисы app и frontend
- Настроить CI/CD pipeline (GitHub Actions): build → test → docker push → deploy

---

### SSE Polling Optimization

**Files:** `execution/stream/ExecutionStreamService.java`, `batch/run/BatchRunStreamService.java`, `execution/flow/FlowExecutionService.java`

**Проблема:** SSE реализован через DB polling каждые 300ms. `FlowExecutionService.startAsync()` запускает виртуальный поток через `Thread.ofVirtual().start()` — без ограничения параллелизма.

**Подзадачи:**
- Перенести `startAsync()` в `FlowExecutionService` на `ExecutorService` (аналогично BatchRunService)
- Рассмотреть замену DB polling на Spring Events (`@EventListener`) для SSE push — убирает задержку 300ms
- Добавить backpressure перед масштабированием на многопользовательскую нагрузку

---

### Unified Executions — Backend Aggregation

**Files:** `hooks/use-all-executions.ts`

**Проблема:** Страница executions делает fan-out к нескольким эндпоинтам с фронтенда. При росте данных станет шумным.

**Подзадачи:**
- Добавить `GET /api/executions` — единый пагинированный список по всем типам (flow, operation, batch)
- Поддержать фильтрацию по `type` и `status` на стороне БД
- Заменить frontend fan-out на один запрос

---

### Tests — расширение покрытия

**Проблема:** Сейчас покрыты только `FlowCompiler` (unit) и `ExtractionRuleRepository` (integration). Execution и batch пути не покрыты.

**Подзадачи:**
- Integration тест для `FlowService` — CRUD через реальную БД
- Integration тест для `FlowCompiler` — компиляция флоу с реальными данными в БД
- Integration тест для execution пути — `FlowExecutionService` с моком HTTP executor
- Frontend: component тесты для flow editor и execution stream hook

---

## After Alpha — post-launch, when auth becomes necessary

### Auth & Multi-Tenancy

**Files:** `shared/TenantContext.java`, `shared/DevContext.java`

**Проблема:** `DevContext` всегда возвращает хардкоженый UUID. Нет аутентификации и изоляции между пользователями.

**Подзадачи:**
- Реализовать JWT-based `TenantContext` — извлекать `ownerId` из токена
- Добавить `findByIdAndOwnerId` варианты во все репозитории
- Закрыть `DevContext` профилем `dev` чтобы не попал в prod

---

### Tenant Isolation in findById

**Files:** `EnvironmentService`, `FlowService`, `OperationService`, `BatchService`

**Проблема:** `findById(UUID id)` ищет только по ID без проверки `ownerId` — любой пользователь может обратиться к чужому ресурсу.

**Подзадачи:**
- Во всех сервисах заменить `findById` на `findByIdAndOwnerId`
- Добавить соответствующие методы в репозитории
- Решается одновременно с Auth задачей выше

---

### Secret Variables

**Files:** `EnvVariable.java`, `EnvironmentService.java`

**Проблема:** API ключи и пароли хранятся и возвращаются plaintext.

**Подзадачи:**
- Добавить поле `secret: boolean` на `EnvVariable`
- Шифровать значение при записи (AES-GCM, master key из конфига)
- Дешифровать при использовании в execution context
- В GET ответах возвращать `"***"` для secret переменных — никогда не отдавать plaintext

---

### SSL Certificate Verification

**File:** `HttpOperationExecutor.java` — `buildTrustAllSslContext()`

**Проблема:** Все HTTPS запросы пропускают проверку сертификата (trust-all).

**Подзадачи:**
- Добавить поле `skipSslVerification: boolean` в `HttpOperationConfig` (default `false`)
- В UI добавить тоггл на форме HTTP операции
- `buildTrustAllSslContext()` использовать только когда флаг явно включён

---

## Backend — Engineering Improvements

Нет user-facing urgency, но улучшают observability и качество кода. Делать opportunistically.

---

### MDC + traceId в логах

**Files:** `execution/flow/FlowExecutionService.java`, `execution/InstantExecutionService.java`, `batch/run/BatchRunService.java`

**Проблема:** Execution логи пишутся без correlation ID. При параллельных запусках невозможно отследить какая строка к какому запуску относится.

**Подзадачи:**
- В начале `execute()` и `runAsync()` писать `MDC.put("runId", run.getId().toString())`
- В `finally` блоке — `MDC.clear()` (обязательно для virtual threads — контекст не очищается автоматически)
- Добавить `%X{runId}` в паттерн логгера в `application.yaml`
- Проверить что в BatchRunService MDC проброшен в дочерние потоки (virtual threads не наследуют MDC автоматически)

---

### Spring Events для межмодульного оповещения

**Files:** `execution/flow/FlowExecutionService.java`, новый `execution/event/`

**Проблема:** По завершении execution нет события. Будущие модули (статистика, нотификации, метрики) вынуждены встраиваться прямо в FlowExecutionService.

**Подзадачи:**
- Создать `FlowExecutionCompletedEvent` record с `runId`, `flowId`, `status`, `durationMs`
- Опубликовать через `ApplicationEventPublisher` в конце `execute()`
- Аналогично для `InstantExecutionService` — `OperationExecutionCompletedEvent`
- Написать пример слушателя `@EventListener` чтобы паттерн был понятен

---

### AOP аспект для аудита execution-запросов

**Files:** `execution/flow/FlowExecutionController.java`, `execution/InstantExecutionController.java`, новый `shared/audit/`

**Проблема:** Нет централизованного логирования входящих execution-запросов.

**Подзадачи:**
- Создать аннотацию `@AuditExecution`
- Реализовать `@Around` аспект: логировать `ownerId`, `flowId`/`operationId`, время ответа, HTTP статус
- Навесить `@AuditExecution` на методы контроллеров
- Никакой бизнес-логики в аспекте — только observability
