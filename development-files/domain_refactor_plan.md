# Domain Refactor Plan

## Цель

Перевести кодовую базу от "пакеты как модули" к явным доменным границам с портами и адаптерами.
После рефакторинга каждый домен можно вырвать в отдельный сервис минимальными изменениями:
только поменять адаптеры (Java вызовы → HTTP/gRPC/events), бизнес-логика не трогается.

---

## Текущие проблемы архитектуры

### 1. execution зависит от flow напрямую через Spring beans
`FlowExecutionService` инжектит `FlowService`, `FlowStepService`, `FlowCompiler` из flow_module.
`InstantExecutionService` инжектит `OperationService` из flow_module.
→ При вынесении execution в отдельный сервис нужно менять бизнес-логику.

### 2. Операции живут внутри flow_module
`Operation` (каталог шаблонов HTTP/SQL/Assert) — это независимый домен.
Сейчас он лежит в `flow_module.operation`, хотя Flow от него зависит, а не наоборот.

### 3. OperationService лезет в FlowStepRepository
При удалении операции `OperationService.delete()` напрямую запрашивает `FlowStepRepository`
чтобы проверить есть ли LINKED шаги. Это нарушение границ: catalog домен знает о структуре flow домена.

### 4. Нет явных портов между модулями
Все зависимости — прямые инжекции Spring beans между пакетами.
Нет ни одного интерфейса-порта, который описывал бы что execution хочет получить от flow.
При сплите непонятно где граница.

### 5. FlowCompiler читает живые данные при каждом запуске
При каждом `execute()` вызывается `FlowCompiler.compile()` который читает шаги, операции,
extraction rules из БД. Это runtime coupling: execution не может работать независимо от flow БД.

---

## Целевые bounded contexts

```
┌─────────────────────────────────────────────────────┐
│                  flowation-api-modulith              │
│                                                     │
│  ┌──────────────┐     ┌──────────────┐              │
│  │   catalog    │     │ environment  │              │
│  │              │     │              │              │
│  │  Operation   │     │ Environment  │              │
│  │  OperConfig  │     │ EnvVariable  │              │
│  └──────┬───────┘     └──────┬───────┘              │
│         │ (порт)             │ (порт)               │
│  ┌──────▼───────┐            │                      │
│  │     flow     │            │                      │
│  │              │            │                      │
│  │  Flow        │            │                      │
│  │  FlowStep    │            │                      │
│  │  ExtrRule    │            │                      │
│  │  FlowCompiler│            │                      │
│  └──────┬───────┘            │                      │
│         │ (порт)             │ (порт)               │
│  ┌──────▼────────────────────▼───┐                  │
│  │          execution            │                  │
│  │                               │                  │
│  │  InstantExecutionService      │                  │
│  │  FlowExecutionService         │                  │
│  │  ExecutionRun                 │                  │
│  │  ExecutionStepResult          │                  │
│  │  Executors (Http/Sql/Assert)  │                  │
│  └───────────────────────────────┘                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │                   shared                     │   │
│  │  TenantContext, exceptions, JDBC converters  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Правило зависимостей:**
- `catalog` ← ни от кого не зависит
- `environment` ← ни от кого не зависит
- `flow` ← зависит от `catalog` (только через порт)
- `execution` ← зависит от `flow` и `catalog` и `environment` (только через порты)
- `shared` ← все зависят от него, он ни от кого

---

## Паттерн: Port & Adapter (Hexagonal)

Каждый модуль определяет интерфейс (порт) описывающий что ему нужно снаружи.
Другой модуль предоставляет реализацию (адаптер).

При переходе на микросервисы: меняем только адаптер (Java вызов → HTTP клиент).
Порт и бизнес-логика не трогаются.

```
[ execution module ]           [ flow module ]
                                               
  FlowPlanPort (interface)  ←  FlowPlanAdapter (implements FlowPlanPort)
                                   └── вызывает FlowService, FlowCompiler
                                               
  OperationPort (interface)  ← OperationAdapter (implements OperationPort)
                                   └── вызывает OperationService
                                               
  EnvContextPort (interface) ← EnvContextAdapter (implements EnvContextPort)
                                   └── вызывает EnvironmentService
```

---

## Шаг 1 — Переименование пакетов (pure rename, логика не меняется)

Цель: убрать суффикс `_module`, сделать названия доменными.

```
flow_module.operation.*    →  catalog.*
flow_module.flow.*         →  flow.*
flow_module.compiler.*     →  flow.compiler.*
execution_module.*         →  execution.*
environment_module.*       →  environment.*
shared.*                   →  shared.*  (без изменений)
```

Это чистый рефакторинг без изменения логики. После него структура читается как домены,
а не как технические слои.

---

## Шаг 2 — Выделение catalog домена из flow_module

Сейчас: `flow_module.operation` — Operation, OperationType, OperationConfig и наследники,
OperationService, OperationRepository, OperationController — всё это каталог операций.

Действие: перенести в отдельный top-level пакет `catalog`.

```
catalog/
  Operation.java
  OperationType.java
  OperationRepository.java
  OperationService.java
  OperationController.java
  config/
    OperationConfig.java        ← sealed interface
    HttpOperationConfig.java
    SqlOperationConfig.java
    AssertOperationConfig.java
  dto/
    request/
      OperationCreateRequest.java
      OperationUpdateRequest.java
    response/
      OperationResponse.java    ← новый DTO (из api_contract_plan)
```

Зависимости catalog: только `shared`. Никаких зависимостей на flow или execution.

---

## Шаг 3 — Порт: execution → catalog (OperationPort)

execution модуль нуждается в данных операции при InstantExecution. Сейчас он инжектит `OperationService` напрямую.

Создать порт в `execution` пакете:

```java
// execution/port/OperationPort.java
public interface OperationPort {
    Operation findById(UUID operationId);
}
```

Адаптер в `catalog` пакете:

```java
// catalog/adapter/OperationPortAdapter.java
@Component
@RequiredArgsConstructor
public class OperationPortAdapter implements OperationPort {
    private final OperationService operationService;

    @Override
    public Operation findById(UUID operationId) {
        return operationService.findById(operationId);
    }
}
```

`InstantExecutionService` инжектит `OperationPort` — не `OperationService`.

При сплите catalog → отдельный сервис: `OperationPortAdapter` меняется на HTTP клиент.
`InstantExecutionService` не трогается.

---

## Шаг 4 — Порт: execution → flow (FlowPlanPort)

Это самый важный порт. `FlowExecutionService` сейчас инжектит три сервиса из flow_module.
Нужно абстрагировать то, что execution реально хочет: **скомпилированный план флоу**.

Создать порт в `execution` пакете:

```java
// execution/port/FlowPlanPort.java
public interface FlowPlanPort {
    /**
     * Возвращает полностью скомпилированный список шагов для выполнения.
     * execution модуль не знает ничего о Flow, FlowStep, FlowCompiler —
     * только о List<CompiledStep>.
     */
    List<CompiledStep> compilePlan(UUID flowId);

    String getFlowName(UUID flowId);
}
```

Адаптер в `flow` пакете:

```java
// flow/adapter/FlowPlanAdapter.java
@Component
@RequiredArgsConstructor
public class FlowPlanAdapter implements FlowPlanPort {
    private final FlowService flowService;
    private final FlowCompiler flowCompiler;

    @Override
    public List<CompiledStep> compilePlan(UUID flowId) {
        Flow flow = flowService.findById(flowId);
        return flowCompiler.compile(flow);
    }

    @Override
    public String getFlowName(UUID flowId) {
        return flowService.findById(flowId).getName();
    }
}
```

`FlowExecutionService` инжектит `FlowPlanPort` — больше никаких `FlowService`,
`FlowStepService`, `FlowCompiler` в execution модуле.

При сплите flow → отдельный сервис: `FlowPlanAdapter` меняется на HTTP клиент
который дёргает flow-service endpoint `/internal/flows/{id}/plan`.
`FlowExecutionService` не трогается.

---

## Шаг 5 — Порт: execution → environment (EnvContextPort)

```java
// execution/port/EnvContextPort.java
public interface EnvContextPort {
    /**
     * Возвращает переменные окружения как плоскую Map для seed в runtimeContext.
     * Возвращает пустой Map если environmentId == null.
     */
    Map<String, Object> loadContext(UUID environmentId);
}
```

Адаптер в `environment` пакете:

```java
// environment/adapter/EnvContextAdapter.java
@Component
@RequiredArgsConstructor
public class EnvContextAdapter implements EnvContextPort {
    private final EnvironmentService environmentService;

    @Override
    public Map<String, Object> loadContext(UUID environmentId) {
        if (environmentId == null) return Map.of();
        return environmentService.loadAsContext(environmentId);
    }
}
```

`InstantExecutionService` и `FlowExecutionService` инжектят `EnvContextPort`.
Встроенный null-check убирается из сервисов — порт это гарантирует сам.

---

## Шаг 6 — Удаление cross-domain зависимости OperationService → FlowStepRepository

Сейчас: `OperationService.delete()` читает `FlowStepRepository` чтобы проверить linked шаги.
Это catalog домен знает о flow домене — нарушение.

Решение: **domain event** через Spring `ApplicationEventPublisher`.

```java
// catalog/event/OperationDeleteRequestedEvent.java
public record OperationDeleteRequestedEvent(UUID operationId) {}
```

```java
// catalog/event/OperationDeleteBlockedEvent.java
public record OperationDeleteBlockedEvent(UUID operationId, List<String> linkedFlowNames) {}
```

Альтернатива (проще для монолита): порт в `catalog`:

```java
// catalog/port/OperationUsagePort.java
public interface OperationUsagePort {
    /**
     * Возвращает имена флоу в которых операция используется как LINKED.
     * Пустой список — операцию можно удалять.
     */
    List<String> findLinkedFlowNames(UUID operationId);
}
```

Адаптер в `flow` пакете:

```java
// flow/adapter/OperationUsageAdapter.java
@Component
@RequiredArgsConstructor
public class OperationUsageAdapter implements OperationUsagePort {
    private final FlowStepRepository flowStepRepository;
    private final FlowRepository flowRepository;

    @Override
    public List<String> findLinkedFlowNames(UUID operationId) {
        return flowStepRepository
            .findAllByOperationIdAndBinding(operationId, Binding.LINKED)
            .stream()
            .map(FlowStep::getFlowId)
            .distinct()
            .map(flowId -> flowRepository.findById(flowId)
                .map(Flow::getName)
                .orElse("Unknown flow"))
            .toList();
    }
}
```

`OperationService` инжектит `OperationUsagePort`. Никакого `FlowStepRepository` в catalog.

---

## Шаг 7 — FlowStep.testStep и прямая зависимость на executor

`FlowExecutionService.testStep()` — специальный метод для тестирования одного шага в изоляции.
Сейчас он компилирует шаг и вызывает executor напрямую внутри flow execution service.
Это нормально — testStep это execution операция, она уже в правильном месте.

---

## Итоговая структура пакетов

```
kg.ademity.flowation_api_modulith/
│
├── shared/
│   ├── TenantContext.java
│   ├── DevContext.java
│   ├── JacksonConfig.java
│   ├── exception/
│   │   ├── FlowationException.java
│   │   ├── NotFoundException.java
│   │   └── ValidationException.java
│   └── jdbc/
│       └── ...converters...
│
├── catalog/                          ← был flow_module.operation
│   ├── Operation.java
│   ├── OperationType.java
│   ├── OperationRepository.java
│   ├── OperationService.java
│   ├── OperationController.java
│   ├── config/
│   │   ├── OperationConfig.java
│   │   ├── HttpOperationConfig.java
│   │   ├── SqlOperationConfig.java
│   │   └── AssertOperationConfig.java
│   ├── port/
│   │   └── OperationUsagePort.java   ← интерфейс для flow→catalog зависимости
│   ├── dto/
│   │   ├── request/...
│   │   └── response/
│   │       └── OperationResponse.java
│   └── event/                        ← опционально, если перейдём на события
│       └── OperationDeleteRequestedEvent.java
│
├── flow/                             ← был flow_module.flow + flow_module.compiler
│   ├── Flow.java
│   ├── FlowRepository.java
│   ├── FlowService.java
│   ├── FlowController.java
│   ├── compiler/
│   │   ├── FlowCompiler.java
│   │   ├── CompiledStep.java
│   │   └── FlowCompilationException.java
│   ├── step/
│   │   ├── FlowStep.java
│   │   ├── Binding.java
│   │   ├── StepKind.java
│   │   ├── OnFailStrategy.java
│   │   ├── FlowStepRepository.java
│   │   ├── FlowStepService.java
│   │   ├── FlowStepController.java
│   │   └── extraction/
│   │       ├── ExtractionRule.java
│   │       ├── ExtractionRuleRepository.java
│   │       ├── ExtractionRuleService.java
│   │       └── ExtractionRuleController.java
│   ├── adapter/
│   │   ├── FlowPlanAdapter.java       ← реализует execution.port.FlowPlanPort
│   │   └── OperationUsageAdapter.java ← реализует catalog.port.OperationUsagePort
│   └── dto/
│       ├── request/...
│       └── response/
│           ├── FlowResponse.java
│           ├── FlowStepResponse.java
│           └── ExtractionRuleResponse.java
│
├── execution/                        ← был execution_module
│   ├── AbsentValue.java
│   ├── InstantExecutionController.java
│   ├── InstantExecutionService.java
│   ├── port/
│   │   ├── OperationPort.java        ← что execution хочет от catalog
│   │   ├── FlowPlanPort.java         ← что execution хочет от flow
│   │   └── EnvContextPort.java       ← что execution хочет от environment
│   ├── flow/
│   │   ├── FlowExecutionController.java
│   │   ├── FlowExecutionService.java
│   │   └── JsonPathExtractor.java
│   ├── run/
│   │   ├── ExecutionRun.java
│   │   ├── ExecutionStatus.java
│   │   ├── ExecutionStepResult.java
│   │   ├── RunMode.java
│   │   ├── ExecutionRunRepository.java
│   │   └── ExecutionStepResultRepository.java
│   ├── executor/
│   │   ├── OperationExecutor.java
│   │   ├── HttpOperationExecutor.java
│   │   ├── SqlOperationExecutor.java
│   │   ├── AssertOperationExecutor.java
│   │   ├── StepResult.java
│   │   └── VariableResolver.java
│   ├── exception/
│   │   └── StepExecutionException.java
│   └── dto/
│       ├── ExecutionResultResponse.java
│       ├── FlowExecutionResultResponse.java
│       └── StepResultResponse.java
│
└── environment/                      ← был environment_module
    ├── Environment.java
    ├── EnvVariable.java
    ├── EnvironmentRepository.java
    ├── EnvVariableRepository.java
    ├── EnvironmentService.java
    ├── EnvironmentController.java
    ├── adapter/
    │   └── EnvContextAdapter.java    ← реализует execution.port.EnvContextPort
    └── dto/
        ├── request/...
        └── response/
            └── EnvironmentResponse.java
```

---

## Порядок выполнения

Каждый шаг самодостаточен и не ломает приложение если сделан изолированно.

| # | Шаг | Зависит от |
|---|-----|-----------|
| 1 | API контракт — ввести Response DTO, GlobalExceptionHandler | — |
| 2 | Переименовать пакеты `*_module` → домены | — |
| 3 | Выделить `catalog` из `flow_module.operation` | Шаг 2 |
| 4 | Ввести `OperationUsagePort` + `OperationUsageAdapter` | Шаг 3 |
| 5 | Ввести `OperationPort` в execution | Шаг 3 |
| 6 | Ввести `FlowPlanPort` + `FlowPlanAdapter` | Шаг 2 |
| 7 | Ввести `EnvContextPort` + `EnvContextAdapter` | — |
| 8 | Переместить `adapter/` классы в нужные пакеты | Шаги 4-7 |
| 9 | Убедиться что execution не импортирует ничего из flow/catalog кроме портов | Шаги 5-6 |

---

## Граница готовности к сплиту

После завершения всех шагов критерий готовности:

> В `execution` пакете нет ни одного import из `flow` или `catalog` пакетов
> кроме `CompiledStep` (value object передаётся через порт).

При переходе на микросервисы:
- `CompiledStep` переезжает в shared-library или дублируется в каждом сервисе
- Адаптеры (`FlowPlanAdapter`, `OperationPortAdapter`, `EnvContextAdapter`) становятся HTTP клиентами
- Порты (`FlowPlanPort`, `OperationPort`, `EnvContextPort`) не меняются

---

## Что НЕ нужно делать сейчас

- CQRS — избыточно для текущего масштаба
- Kafka / message broker — пока все домены в одном процессе, Spring Events достаточно
- Отдельные схемы БД на домен — будет нужно при физическом сплите, не раньше
- gRPC / protobuf — только при переходе на реальные микросервисы
