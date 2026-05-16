-- Flowation Database Schema
-- PostgreSQL 16

-- ============================================================
-- Identity
-- ============================================================

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dev user for development without auth module
INSERT INTO users (id, email, password_hash)
VALUES ('00000000-0000-0000-0000-000000000001', 'dev@flowation.local', 'no-auth');

-- ============================================================
-- OperationCatalog
-- ============================================================

CREATE TABLE operation_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(255) NOT NULL,
    parent_group_id UUID REFERENCES operation_groups(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE operations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    group_id        UUID REFERENCES operation_groups(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(20) NOT NULL,
    config_template JSONB NOT NULL,
    version         BIGINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_operations_owner ON operations(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_operations_group ON operations(group_id);
CREATE INDEX idx_operations_type  ON operations(type);

-- ============================================================
-- Flow
-- ============================================================

CREATE TABLE flows (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID NOT NULL REFERENCES users(id),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    version     BIGINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_flows_owner ON flows(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE flow_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id             UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    step_order          INTEGER NOT NULL,
    step_kind           VARCHAR(20) NOT NULL,

    -- OPERATION_STEP: LINKED
    binding             VARCHAR(10),
    operation_id        UUID REFERENCES operations(id),
    config_override     JSONB,

    -- OPERATION_STEP: DETACHED
    own_config          JSONB,
    source_operation_id UUID REFERENCES operations(id),

    -- FLOW_STEP
    nested_flow_id      UUID REFERENCES flows(id),
    on_fail VARCHAR(20) NOT NULL DEFAULT 'STOP_FLOW', -- STOP_FLOW | SKIP_AND_CONTINUE

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
        binding IS NULL
    )
);

CREATE INDEX idx_flow_steps_operation_id   ON flow_steps(operation_id)   WHERE operation_id IS NOT NULL;
CREATE INDEX idx_flow_steps_flow_id        ON flow_steps(flow_id);
CREATE INDEX idx_flow_steps_nested_flow_id ON flow_steps(nested_flow_id) WHERE nested_flow_id IS NOT NULL;

CREATE TABLE extraction_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_step_id    UUID NOT NULL REFERENCES flow_steps(id) ON DELETE CASCADE,
    source_path     VARCHAR(500) NOT NULL,
    target_variable VARCHAR(255) NOT NULL,
    rule_order      INTEGER NOT NULL,
    UNIQUE (flow_step_id, rule_order)
);

CREATE INDEX idx_extraction_rules_step ON extraction_rules(flow_step_id);

-- ============================================================
-- Environment
-- ============================================================

CREATE TABLE environments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_environments_owner ON environments(owner_id) WHERE deleted_at IS NULL;

CREATE TABLE env_variables (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment_id UUID NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    key            VARCHAR(255) NOT NULL,
    value          TEXT NOT NULL,
    UNIQUE (environment_id, key)
);

CREATE INDEX idx_env_variables_env ON env_variables(environment_id);

-- ============================================================
-- Execution
-- ============================================================

CREATE TABLE execution_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID NOT NULL REFERENCES users(id),
    run_mode       VARCHAR(10) NOT NULL,
    status         VARCHAR(10) NOT NULL,

    operation_id   UUID REFERENCES operations(id),
    flow_id        UUID REFERENCES flows(id),
    batch_group_id UUID,

    environment_id UUID REFERENCES environments(id),

    execution_plan JSONB NOT NULL,

    started_at     TIMESTAMPTZ,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_runs_owner  ON execution_runs(owner_id);
CREATE INDEX idx_exec_runs_flow   ON execution_runs(flow_id)        WHERE flow_id IS NOT NULL;
CREATE INDEX idx_exec_runs_status ON execution_runs(status);
CREATE INDEX idx_exec_runs_batch  ON execution_runs(batch_group_id) WHERE batch_group_id IS NOT NULL;

CREATE TABLE execution_step_results (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_run_id UUID NOT NULL REFERENCES execution_runs(id) ON DELETE CASCADE,
    step_index       INTEGER NOT NULL,
    step_ref_id      UUID,

    status           VARCHAR(10) NOT NULL,

    request_snapshot  JSONB,
    response_snapshot JSONB,
    error_message     TEXT,
    duration_ms       INTEGER,

    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    UNIQUE (execution_run_id, step_index)
);

CREATE INDEX idx_exec_steps_run ON execution_step_results(execution_run_id);

-- ============================================================
-- Batch
-- ============================================================

CREATE TABLE batches (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id),
    name       VARCHAR(255) NOT NULL,
    mode       VARCHAR(20) NOT NULL, -- MULTI | DATA_DRIVEN
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_batches_owner ON batches(owner_id) WHERE deleted_at IS NULL;

-- MULTI: N items (each runs once) | DATA_DRIVEN: exactly 1 item (runs per data row)
CREATE TABLE batch_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    item_type    VARCHAR(20) NOT NULL, -- FLOW | OPERATION
    reference_id UUID NOT NULL,        -- flow_id or operation_id (soft ref, no FK)
    item_order   INTEGER NOT NULL,
    UNIQUE (batch_id, item_order)
);

CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);

-- Only for DATA_DRIVEN mode: each row produces one parallel execution
CREATE TABLE batch_data_rows (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id  UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    row_order INTEGER NOT NULL,
    variables JSONB NOT NULL,          -- {"username": "alice", "password": "pass1"}
    UNIQUE (batch_id, row_order)
);

CREATE INDEX idx_batch_data_rows_batch ON batch_data_rows(batch_id);

CREATE TABLE batch_runs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id     UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    owner_id     UUID NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL,
    started_at   TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_runs_batch  ON batch_runs(batch_id);
CREATE INDEX idx_batch_runs_status ON batch_runs(status);
