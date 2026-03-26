# Flowation — Database Schema

## Карта таблиц по контекстам

```
Identity            OperationCatalog          Flow
────────            ────────────────          ────
users               operation_groups          flows
                    operations                flow_steps
                                              extraction_rules

Environment         Execution
───────────         ─────────
environments        execution_runs
env_variables       execution_step_results
```

---

## Identity

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## OperationCatalog

### operation_groups

Зарезервировано под группировку операций ("папки"). Пока не реализуем,
но `group_id` в `operations` уже ссылается сюда — место для роста без миграций.

```sql
CREATE TABLE operation_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    parent_group_id UUID REFERENCES operation_groups(id),  -- вложенные папки
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### operations

```sql
CREATE TABLE operations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    group_id        UUID REFERENCES operation_groups(id),  -- null = без группы
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(20) NOT NULL,                  -- HTTP | SQL | ASSERT
    config_template JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operations_owner ON operations(owner_id);
CREATE INDEX idx_operations_group ON operations(group_id);
CREATE INDEX idx_operations_type  ON operations(type);
```

**Почему `config_template` — JSONB, а не отдельные таблицы per-type:**
тип уже хранится в колонке `type`, структура детерминирована. JSONB проще
эволюционирует — добавить поле = без миграции. Валидация на уровне приложения при записи.

**Структура `config_template` по типам:**

```jsonc
// HTTP
{
  "method": "POST",
  "url": "{{base_url}}/auth/login",
  "headers": { "Content-Type": "application/json" },
  "body": "{\"email\": \"{{user_email}}\"}",
  "timeoutMs": 5000
}

// SQL
{
  "dbType": "POSTGRES",             // POSTGRES | MYSQL
  "connectionString": "{{db_url}}",
  "query": "SELECT * FROM users WHERE id = {{user_id}}"
}

// ASSERT
{
  "expression": "{{response.status}}",
  "comparator": "EQ",               // EQ | NEQ | CONTAINS | REGEX | GT | LT | IS_NULL ...
  "expected": "200"
}
```

---

## Flow

### flows

```sql
CREATE TABLE flows (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_flows_owner ON flows(owner_id);
```

### flow_steps

Каждый шаг — либо `OPERATION_STEP`, либо `FLOW_STEP` (вложенный флоу).

| step_kind        | binding  | что заполнено                                  |
|------------------|----------|------------------------------------------------|
| OPERATION_STEP   | LINKED   | `operation_id`, опционально `config_override`  |
| OPERATION_STEP   | DETACHED | `own_config`, опционально `source_operation_id`|
| FLOW_STEP        | —        | `nested_flow_id`                               |

```sql
CREATE TABLE flow_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id             UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    step_order          INTEGER NOT NULL,
    step_kind           VARCHAR(20) NOT NULL,   -- OPERATION_STEP | FLOW_STEP

    -- OPERATION_STEP: LINKED
    binding             VARCHAR(10),            -- LINKED | DETACHED
    operation_id        UUID REFERENCES operations(id),
    config_override     JSONB,                  -- дельта поверх config_template

    -- OPERATION_STEP: DETACHED
    own_config          JSONB,                  -- полный независимый конфиг
    source_operation_id UUID REFERENCES operations(id),  -- откуда скопировано (UI-метаданные)

    -- FLOW_STEP
    nested_flow_id      UUID REFERENCES flows(id),       -- всегда LINKED

    UNIQUE (flow_id, step_order),

    CONSTRAINT chk_step_kind CHECK (
        (step_kind = 'OPERATION_STEP' AND nested_flow_id IS NULL AND binding IS NOT NULL)
        OR
        (step_kind = 'FLOW_STEP' AND nested_flow_id IS NOT NULL AND binding IS NULL)
    ),
    CONSTRAINT chk_linked_or_detached CHECK (
        (binding = 'LINKED'   AND operation_id IS NOT NULL AND own_config IS NULL)
        OR
        (binding = 'DETACHED' AND own_config IS NOT NULL  AND operation_id IS NULL)
        OR
        binding IS NULL   -- FLOW_STEP
    )
);

-- Ключевой индекс: найти все LINKED шаги ссылающиеся на операцию
-- используется при проверке "можно ли удалить Operation"
CREATE INDEX idx_flow_steps_operation_id   ON flow_steps(operation_id)    WHERE operation_id IS NOT NULL;
CREATE INDEX idx_flow_steps_flow_id        ON flow_steps(flow_id);
CREATE INDEX idx_flow_steps_nested_flow_id ON flow_steps(nested_flow_id)  WHERE nested_flow_id IS NOT NULL;
```

### extraction_rules

Правила извлечения значений из ответа шага → в RuntimeContext.
Настраиваются при проектировании флоу (design-time), но могут быть переопределены
через `execution_plan` при запуске.

```sql
CREATE TABLE extraction_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_step_id    UUID NOT NULL REFERENCES flow_steps(id) ON DELETE CASCADE,
    source_path     VARCHAR(500) NOT NULL,   -- JSONPath: $.body.token
    target_variable VARCHAR(255) NOT NULL,   -- ключ в RuntimeContext: auth_token
    rule_order      INTEGER NOT NULL,
    UNIQUE (flow_step_id, rule_order)
);

CREATE INDEX idx_extraction_rules_step ON extraction_rules(flow_step_id);
```

---

## Environment

```sql
CREATE TABLE environments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_environments_owner ON environments(owner_id);

CREATE TABLE env_variables (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key            VARCHAR(255) NOT NULL,
    value          TEXT NOT NULL,
    UNIQUE (environment_id, key)
);

CREATE INDEX idx_env_variables_env ON env_variables(environment_id);
```

---

## Execution

### execution_runs

```sql
CREATE TABLE execution_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL REFERENCES users(id),
    run_mode       VARCHAR(10) NOT NULL,   -- INSTANT | FLOW | BATCH
    status         VARCHAR(10) NOT NULL,   -- PENDING | RUNNING | COMPLETED | FAILED

    -- что запускалось:
    operation_id   UUID REFERENCES operations(id),    -- если INSTANT
    flow_id        UUID REFERENCES flows(id),          -- если FLOW
    batch_group_id UUID,                               -- если BATCH (группирует несколько runs)

    environment_id UUID REFERENCES environments(id),

    -- неизменяемый снимок плана на момент старта:
    execution_plan JSONB NOT NULL,

    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_runs_owner  ON execution_runs(owner_id);
CREATE INDEX idx_exec_runs_flow   ON execution_runs(flow_id)         WHERE flow_id IS NOT NULL;
CREATE INDEX idx_exec_runs_status ON execution_runs(status);
CREATE INDEX idx_exec_runs_batch  ON execution_runs(batch_group_id)  WHERE batch_group_id IS NOT NULL;
```

### execution_step_results

```sql
CREATE TABLE execution_step_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    step_index       INTEGER NOT NULL,   -- позиция в скомпилированном плане
    step_ref_id      UUID,               -- flow_steps.id, без FK — намеренно (см. ниже)

    status           VARCHAR(10) NOT NULL,  -- PENDING | RUNNING | COMPLETED | FAILED | SKIPPED

    request_snapshot  JSONB,   -- что ушло: HTTP request / SQL query
    response_snapshot JSONB,   -- что пришло: HTTP response / SQL result / assert result
    error_message     TEXT,
    duration_ms       INTEGER,

    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    UNIQUE (execution_run_id, step_index)
);

CREATE INDEX idx_exec_steps_run ON execution_step_results(execution_run_id);
```

> `step_ref_id` хранит `flow_steps.id` без FK намеренно: флоу может быть изменён
> или удалён после запуска, а результаты должны оставаться валидными и читаемыми.

**Структура `execution_plan` (JSONB снимок):**

```jsonc
{
  "compiledAt": "2025-03-25T10:00:00Z",
  "sourceFlowId": "uuid",
  "environmentSnapshot": {
    "id": "uuid",
    "name": "Staging",
    "variables": {
      "base_url": "https://staging.api.com",
      "api_key": "***"
    }
  },
  "steps": [
    {
      "stepIndex": 0,
      "stepRefId": "flow_step_uuid",
      "operationName": "Login",
      "operationType": "HTTP",
      // {{переменные}} НЕ подставляются при компиляции —
      // только в момент фактического выполнения шага из RuntimeContext
      "mergedConfig": {
        "method": "POST",
        "url": "{{base_url}}/auth/login",
        "headers": {},
        "body": "{\"email\": \"{{user_email}}\"}"
      },
      "extractionRules": [
        { "sourcePath": "$.body.token", "targetVariable": "auth_token" }
      ]
    },
    {
      "stepIndex": 1,
      "stepRefId": "flow_step_uuid_2",
      "operationName": "Get Profile",
      "operationType": "HTTP",
      "mergedConfig": {
        "method": "GET",
        "url": "{{base_url}}/users/me",
        "headers": { "Authorization": "Bearer {{auth_token}}" }
      },
      "extractionRules": []
    }
  ]
}
```

---

## Запросы

### 1. Проверка перед удалением Operation

Найти все LINKED FlowStep-ы ссылающиеся на операцию.
Если запрос возвращает строки — удаление заблокировано,
отдаём пользователю список флоу для ручного detach.

```sql
SELECT
    fs.id        AS step_id,
    f.id         AS flow_id,
    f.name       AS flow_name
FROM flow_steps fs
JOIN flows f ON f.id = fs.flow_id
WHERE fs.operation_id = :operationId
  AND fs.binding      = 'LINKED'
  AND f.owner_id      = :userId;
```

---

### 2. Загрузить полный Flow со всеми шагами

```sql
SELECT
    f.id             AS flow_id,
    f.name           AS flow_name,
    fs.id            AS step_id,
    fs.step_order,
    fs.step_kind,
    fs.binding,
    fs.config_override,
    fs.own_config,
    -- LINKED operation:
    o.id             AS op_id,
    o.name           AS op_name,
    o.type           AS op_type,
    o.config_template,
    -- DETACHED: откуда скопировано (только для UI):
    src.name         AS source_op_name,
    -- вложенный флоу:
    nf.id            AS nested_flow_id,
    nf.name          AS nested_flow_name
FROM flows f
JOIN  flow_steps fs     ON fs.flow_id            = f.id
LEFT JOIN operations o  ON o.id                  = fs.operation_id
LEFT JOIN operations src ON src.id               = fs.source_operation_id
LEFT JOIN flows nf      ON nf.id                 = fs.nested_flow_id
WHERE f.id       = :flowId
  AND f.owner_id = :userId
ORDER BY fs.step_order;
```

---

### 3. Шаги флоу с extraction rules одним запросом

```sql
SELECT
    fs.id            AS step_id,
    fs.step_order,
    er.id            AS rule_id,
    er.source_path,
    er.target_variable,
    er.rule_order
FROM flow_steps fs
LEFT JOIN extraction_rules er ON er.flow_step_id = fs.id
WHERE fs.flow_id = :flowId
ORDER BY fs.step_order, er.rule_order;
```

---

### 4. История запусков флоу с агрегатами

```sql
SELECT
    er.id,
    er.status,
    er.started_at,
    er.completed_at,
    EXTRACT(EPOCH FROM (er.completed_at - er.started_at)) * 1000 AS duration_ms,
    e.name           AS environment_name,
    COUNT(esr.id)                                          AS total_steps,
    COUNT(esr.id) FILTER (WHERE esr.status = 'COMPLETED') AS passed_steps,
    COUNT(esr.id) FILTER (WHERE esr.status = 'FAILED')    AS failed_steps
FROM execution_runs er
LEFT JOIN environments e             ON e.id  = er.environment_id
LEFT JOIN execution_step_results esr ON esr.execution_run_id = er.id
WHERE er.flow_id  = :flowId
  AND er.owner_id = :userId
GROUP BY er.id, e.name
ORDER BY er.created_at DESC
LIMIT 20;
```

---

### 5. Все операции с количеством использований в флоу

```sql
SELECT
    o.id,
    o.name,
    o.type,
    og.name                                                         AS group_name,
    COUNT(fs.id) FILTER (WHERE fs.binding = 'LINKED')              AS linked_count,
    COUNT(fs.id) FILTER (WHERE fs.source_operation_id = o.id)      AS detached_count,
    COUNT(DISTINCT fs.flow_id)                                      AS flows_count
FROM operations o
LEFT JOIN operation_groups og ON og.id  = o.group_id
LEFT JOIN flow_steps fs       ON fs.operation_id = o.id
                              OR fs.source_operation_id = o.id
WHERE o.owner_id = :userId
GROUP BY o.id, og.name
ORDER BY og.name NULLS LAST, o.name;
```

---

### 6. Детальный результат конкретного запуска

```sql
SELECT
    er.id            AS run_id,
    er.run_mode,
    er.status        AS run_status,
    er.started_at,
    er.completed_at,
    er.execution_plan,
    esr.step_index,
    esr.status       AS step_status,
    esr.duration_ms,
    esr.error_message,
    esr.request_snapshot,
    esr.response_snapshot
FROM execution_runs er
JOIN execution_step_results esr ON esr.execution_run_id = er.id
WHERE er.id       = :runId
  AND er.owner_id = :userId
ORDER BY esr.step_index;
```

---

## Открытые вопросы

### Секретные переменные в Environment

Сейчас `value TEXT NOT NULL` — всё в открытом виде. `api_key`, пароли БД
будут видны в открытом виде. Стоит добавить:

```sql
ALTER TABLE env_variables ADD COLUMN is_secret BOOLEAN NOT NULL DEFAULT false;
```

Зашифрованное значение хранить на уровне приложения (AES, ключ из конфига).
При чтении — расшифровывать в сервисе, в API не отдавать значение если `is_secret = true`.

### Soft delete

Сейчас Operation/Flow удаляются жёстко. `execution_plan` как JSONB-снимок
уже решает проблему читаемости прошлых запусков. Но если нужна полная история
("показать операцию, которую запускали полгода назад") — добавить `deleted_at TIMESTAMPTZ`
и фильтровать `WHERE deleted_at IS NULL` во всех запросах.
