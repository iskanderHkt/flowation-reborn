# API Contract Plan

## Цель

Зафиксировать стабильный API контракт между бекендом и фронтендом.
Сейчас контроллеры возвращают entity напрямую — это значит любое изменение
схемы БД ломает фронт без предупреждения. Нужно ввести явные Response DTO
для всех ресурсов и убрать утечку внутренних полей (ownerId, groupId и др.)

---

## Принципы контракта

- Контроллер **никогда** не возвращает entity. Только DTO.
- Internal поля (ownerId, flowId как parent context, и т.д.) **не попадают** в ответ если клиенту они не нужны.
- Структура DTO стабильна — изменения entity не должны автоматически менять API.
- Если поле удаляется из entity или переименовывается — DTO остаётся прежним (адаптируется маппинг).
- URL пути и HTTP методы не меняются без необходимости.

---

## Текущее состояние (что сейчас возвращается)

| Контроллер | Сейчас возвращает | Проблема |
|---|---|---|
| `FlowController` | entity `Flow` | ownerId утекает в ответ |
| `FlowStepController` | entity `FlowStep` | все поля, включая внутренние |
| `OperationController` | entity `Operation` | ownerId, groupId утекают |
| `ExtractionRuleController` | entity `ExtractionRule` | нормально, но не через DTO |
| `EnvironmentController` | `EnvironmentResponse` (DTO) | уже правильно |
| `InstantExecutionController` | `ExecutionResultResponse` (DTO) | уже правильно |
| `FlowExecutionController` | `FlowExecutionResultResponse` (DTO) | уже правильно |

---

## Целевые Response DTO

### FlowResponse

```java
public record FlowResponse(
    UUID id,
    String name,
    String description,
    Instant createdAt,
    Instant updatedAt
) {}
```

**Убрано:** `ownerId` — клиенту не нужен, это внутренний multi-tenancy идентификатор.

---

### FlowStepResponse

```java
public record FlowStepResponse(
    UUID id,
    UUID flowId,
    Integer stepOrder,
    StepKind stepKind,
    Binding binding,
    UUID operationId,
    OperationConfig configOverride,  // null если не переопределён
    OperationConfig ownConfig,       // null если LINKED
    UUID sourceOperationId,          // id операции-шаблона для DETACHED
    UUID nestedFlowId,               // null если OPERATION_STEP
    OnFailStrategy onFail
) {}
```

**Оставлено всё** — все поля нужны редактору флоу на фронте.
`flowId` оставляем — фронт использует его для понимания контекста
при работе с inline sub-flow expansion.

---

### OperationResponse

```java
public record OperationResponse(
    UUID id,
    String name,
    OperationType type,
    OperationConfig configTemplate,
    Instant createdAt,
    Instant updatedAt
) {}
```

**Убрано:** `ownerId` — внутреннее поле. `groupId` — поле не используется нигде,
уберём до тех пор пока не будет реализована группировка.

---

### ExtractionRuleResponse

```java
public record ExtractionRuleResponse(
    UUID id,
    UUID flowStepId,
    String sourcePath,
    String targetVariable,
    Integer ruleOrder
) {}
```

Всё оставляем — поля используются на фронте, и ни одно не является внутренним.

---

### EnvironmentResponse (уже существует, не меняется)

```java
public record EnvironmentResponse(
    UUID id,
    String name,
    List<VariableEntry> variables,
    Instant createdAt,
    Instant updatedAt
) {
    public record VariableEntry(UUID id, String key, String value) {}
}
```

---

### ExecutionResultResponse (уже существует, не меняется)

```java
public record ExecutionResultResponse(
    UUID runId,
    UUID operationId,
    RunMode runMode,
    ExecutionStatus status,
    Instant startedAt,
    Instant completedAt,
    int durationMs,
    Map<String, Object> requestSnapshot,
    Map<String, Object> responseSnapshot,
    String errorMessage
) {}
```

---

### FlowExecutionResultResponse (уже существует, не меняется)

```java
public record FlowExecutionResultResponse(
    UUID runId,
    UUID flowId,
    RunMode runMode,
    ExecutionStatus status,
    Instant startedAt,
    Instant completedAt,
    int totalDurationMs,
    List<StepResultResponse> steps
) {}
```

---

### StepResultResponse (уже существует, не меняется)

```java
public record StepResultResponse(
    int stepIndex,
    UUID stepRefId,
    ExecutionStatus status,
    Map<String, Object> requestSnapshot,
    Map<String, Object> responseSnapshot,
    String errorMessage,
    Integer durationMs,
    Instant startedAt,
    Instant completedAt
) {}
```

---

## Полный перечень эндпоинтов (стабилизированный контракт)

### Operations — `/api/operations`

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `/api/operations` | — | `List<OperationResponse>` |
| GET | `/api/operations/{id}` | — | `OperationResponse` |
| POST | `/api/operations` | `OperationCreateRequest` | `OperationResponse` |
| PUT | `/api/operations/{id}` | `OperationUpdateRequest` | `OperationResponse` |
| DELETE | `/api/operations/{id}` | — | `204 No Content` |
| POST | `/api/operations/{id}/execute` | `?environmentId=` (query param) | `ExecutionResultResponse` |
| GET | `/api/operations/{id}/executions` | — | `List<ExecutionResultResponse>` |

### Flows — `/api/flows`

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `/api/flows` | — | `List<FlowResponse>` |
| GET | `/api/flows/{id}` | — | `FlowResponse` |
| POST | `/api/flows` | `FlowCreateRequest` | `FlowResponse` |
| PUT | `/api/flows/{id}` | `FlowUpdateRequest` | `FlowResponse` |
| DELETE | `/api/flows/{id}` | — | `204 No Content` |
| POST | `/api/flows/{id}/execute` | `?environmentId=` (query param) | `FlowExecutionResultResponse` |
| GET | `/api/flows/{id}/executions` | — | `List<FlowExecutionResultResponse>` |

### Flow Steps — `/api/flows/{flowId}/steps`

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `/api/flows/{flowId}/steps` | — | `List<FlowStepResponse>` |
| GET | `/api/flows/{flowId}/steps/{stepId}` | — | `FlowStepResponse` |
| POST | `/api/flows/{flowId}/steps` | `FlowStepCreateRequest` | `FlowStepResponse` |
| PUT | `/api/flows/{flowId}/steps/{stepId}` | `FlowStepUpdateRequest` | `FlowStepResponse` |
| DELETE | `/api/flows/{flowId}/steps/{stepId}` | — | `204 No Content` |
| PUT | `/api/flows/{flowId}/steps/reorder` | `List<ReorderEntry>` | `204 No Content` |
| POST | `/api/flows/{flowId}/steps/{stepId}/test` | — | `StepResultResponse` |

### Extraction Rules — `/api/flows/{flowId}/steps/{stepId}/rules`

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `.../rules` | — | `List<ExtractionRuleResponse>` |
| POST | `.../rules` | `ExtractionRuleCreateRequest` | `ExtractionRuleResponse` |
| PUT | `.../rules/{ruleId}` | `ExtractionRuleUpdateRequest` | `ExtractionRuleResponse` |
| DELETE | `.../rules/{ruleId}` | — | `204 No Content` |

### Environments — `/api/environments`

| Method | Path | Request body | Response |
|--------|------|-------------|----------|
| GET | `/api/environments` | — | `List<EnvironmentResponse>` |
| GET | `/api/environments/{id}` | — | `EnvironmentResponse` |
| POST | `/api/environments` | `EnvironmentCreateRequest` | `EnvironmentResponse` |
| PUT | `/api/environments/{id}` | `EnvironmentUpdateRequest` | `EnvironmentResponse` |
| DELETE | `/api/environments/{id}` | — | `204 No Content` |
| PUT | `/api/environments/{id}/variables` | `UpsertVariablesRequest` | `EnvironmentResponse` |

---

## Стандарт ошибок

Сейчас ошибки возвращаются как 500 с raw exception message. Нужен единый формат.
Реализуется через `@RestControllerAdvice`.

```json
{
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Flow with id 123e4567... was not found",
  "timestamp": "2026-04-10T12:00:00Z"
}
```

| Исключение | HTTP статус |
|---|---|
| `NotFoundException` | `404 Not Found` |
| `ValidationException` | `422 Unprocessable Entity` |
| `FlowCompilationException` | `422 Unprocessable Entity` |
| `StepExecutionException` | `500 Internal Server Error` |
| Любое другое `RuntimeException` | `500 Internal Server Error` |

---

## Что нужно сделать на бекенде

1. Создать `FlowResponse`, `FlowStepResponse`, `OperationResponse`, `ExtractionRuleResponse` records
   - Разместить в `dto/response` пакете соответствующего модуля
2. Добавить маппинг entity → DTO в каждый сервис (метод `toResponse(Entity e)`)
3. Обновить контроллеры — возвращать DTO вместо entity
4. Создать `GlobalExceptionHandler` (`@RestControllerAdvice`) для единого формата ошибок

## Что нужно сделать на фронтенде

Названия полей в ответах не меняются — только убираются лишние поля (`ownerId`, `groupId`).
Фронт их не использует, поэтому **изменений на фронте не требуется**.

Единственное что стоит добавить: обработку стандартных error response
в api клиенте (сейчас ошибки парсятся как raw text или не обрабатываются совсем).
