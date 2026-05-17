# Задачи

## ✅ Готово

- [x] SSE — стриминг прогресса выполнения
- [x] Страница Executions — единая история по всем типам
- [x] Группы операций — CRUD, фильтр, форма
- [x] Strategy Registry для OperationExecutor — EnumMap, O(1) lookup
- [x] @Version — оптимистичная блокировка на Flow и Operation
- [x] CompletableFuture — параллельный batch через virtual threads
- [x] N+1 в FlowCompiler — 3-фазная компиляция, один запрос
- [x] Unit-тесты FlowCompiler — 3 теста
- [x] Integration-тесты — Testcontainers + PostgreSQL, базовая инфраструктура
- [x] Mock Stand — `docker-compose.mock.yml` поднимает Postgres + Go API одной командой

---

## Before Alpha

*(пусто)*

---

## On Alpha

- [ ] **Деплой и CI/CD** `high`  
  `application-prod.yaml` + `Dockerfile` (multi-stage) + GitHub Actions (build → test → push → deploy)

- [ ] **SSE polling → Spring Events** `medium`  
  `ExecutionStreamService`, `BatchRunStreamService` — убрать 300ms DB-polling, заменить на `@EventListener`; перенести `startAsync()` на ExecutorService

- [ ] **Единый GET /api/executions** `medium`  
  `use-all-executions.ts` — убрать frontend fan-out, агрегировать на бэке с фильтрацией по type/status

- [ ] **Тесты — расширение покрытия** `medium`  
  Integration: FlowService CRUD, FlowCompiler с реальной БД, FlowExecutionService с моком HTTP-executor  
  Frontend: flow editor, execution stream hook

- [ ] **MDC + traceId в логах** `low`  
  `FlowExecutionService`, `InstantExecutionService`, `BatchRunService` — `MDC.put("runId", ...)` + `MDC.clear()` в finally

- [ ] **Spring Events для межмодульного оповещения** `low`  
  `FlowExecutionCompletedEvent`, `OperationExecutionCompletedEvent` — публиковать через `ApplicationEventPublisher`

- [ ] **AOP-аспект @AuditExecution** `low`  
  `shared/audit/` — логировать ownerId, flowId, время ответа, HTTP-статус на контроллерах

---

## After Alpha

- [ ] **Auth и мультитенантность** `high`  
  `TenantContext` — JWT-based `ownerId`; закрыть `DevContext` профилем `dev`

- [ ] **Изоляция тенантов в findById** `high`  
  Все сервисы — заменить `findById` на `findByIdAndOwnerId` (решается вместе с Auth)

- [ ] **Секретные переменные** `medium`  
  `EnvVariable` — поле `secret: boolean`, AES-GCM шифрование, `"***"` в GET-ответах

- [ ] **Проверка SSL-сертификатов** `low`  
  `HttpOperationExecutor` — поле `skipSslVerification` в конфиге, тоггл в UI; trust-all только по явному флагу
