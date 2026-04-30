-- Flowation seed data
-- Populates catalog with mock-server (Go API :8081) and mock-db (:5433) operations,
-- two flows (one nesting the other), and two batches (MULTI smoke + DATA_DRIVEN parallel).
-- Runs after init.sql (alphabetical ordering in /docker-entrypoint-initdb.d).

-- ============================================================
-- Environment
-- ============================================================

INSERT INTO environments (id, owner_id, name) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01',
     '00000000-0000-0000-0000-000000000001',
     'mock-local');

INSERT INTO env_variables (environment_id, key, value) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'base_url',            'http://localhost:8081'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'db_conn',             'jdbc:postgresql://localhost:5433/ecommerce?user=ecom_user&password=ecom_password'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'expected_min_count',  '1');

-- ============================================================
-- Operations
-- ============================================================

-- HTTP: GET /products (mock Go API)
INSERT INTO operations (id, owner_id, name, type, config_template) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     '00000000-0000-0000-0000-000000000001',
     'GET products (mock)',
     'HTTP_REQUEST',
     '{"type":"HTTP_REQUEST","method":"GET","url":"{{base_url}}/products","headers":{},"timeoutMs":5000}'::jsonb);

-- SQL: count products in mock-db
INSERT INTO operations (id, owner_id, name, type, config_template) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
     '00000000-0000-0000-0000-000000000001',
     'Count products (mock-db)',
     'SQL_QUERY',
     '{"type":"SQL_QUERY","dbType":"POSTGRES","connectionString":"{{db_conn}}","query":"SELECT count(*) AS cnt FROM products"}'::jsonb);

-- ASSERT: product_count > expected_min_count
INSERT INTO operations (id, owner_id, name, type, config_template) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
     '00000000-0000-0000-0000-000000000001',
     'Assert product count >= expected',
     'ASSERTION',
     '{"type":"ASSERTION","expression":"{{product_count}}","comparator":"GT","expected":"{{expected_min_count}}"}'::jsonb);

-- ============================================================
-- Flow 1: products-smoke (HTTP -> SQL -> ASSERT)
-- ============================================================

INSERT INTO flows (id, owner_id, name, description) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccc01',
     '00000000-0000-0000-0000-000000000001',
     'products-smoke',
     'HTTP ping + SQL count + assertion over the mock ecommerce catalog');

-- step 1: HTTP GET /products (LINKED)
INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, operation_id, on_fail) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     0, 'OPERATION_STEP', 'LINKED',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01',
     'STOP_FLOW');

-- step 2: SQL count (LINKED) + extract $.rows[0].cnt -> product_count
INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, operation_id, on_fail) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     1, 'OPERATION_STEP', 'LINKED',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02',
     'STOP_FLOW');

INSERT INTO extraction_rules (flow_step_id, source_path, target_variable, rule_order) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
     '$.rows[0].cnt',
     'product_count',
     0);

-- step 3: ASSERT (LINKED)
INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, operation_id, on_fail) VALUES
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     2, 'OPERATION_STEP', 'LINKED',
     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03',
     'STOP_FLOW');

-- ============================================================
-- Flow 2: products-wrapper (nested flow + inline DETACHED assert)
-- ============================================================

INSERT INTO flows (id, owner_id, name, description) VALUES
    ('cccccccc-cccc-cccc-cccc-cccccccccc02',
     '00000000-0000-0000-0000-000000000001',
     'products-wrapper',
     'Runs products-smoke as a nested flow then asserts extracted variable propagation');

-- step 1: FLOW_STEP nested -> flow 1
INSERT INTO flow_steps (id, flow_id, step_order, step_kind, nested_flow_id, on_fail) VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffff01',
     'cccccccc-cccc-cccc-cccc-cccccccccc02',
     0, 'FLOW_STEP',
     'cccccccc-cccc-cccc-cccc-cccccccccc01',
     'STOP_FLOW');

-- step 2: DETACHED ASSERT - verify product_count propagated from nested flow
INSERT INTO flow_steps (id, flow_id, step_order, step_kind, binding, own_config, on_fail) VALUES
    ('ffffffff-ffff-ffff-ffff-ffffffffff02',
     'cccccccc-cccc-cccc-cccc-cccccccccc02',
     1, 'OPERATION_STEP', 'DETACHED',
     '{"type":"ASSERTION","expression":"{{product_count}}","comparator":"IS_NOT_NULL"}'::jsonb,
     'STOP_FLOW');

-- ============================================================
-- Batch 1: MULTI smoke - runs both flows once in parallel
-- ============================================================

INSERT INTO batches (id, owner_id, name, mode) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddd01',
     '00000000-0000-0000-0000-000000000001',
     'smoke-multi',
     'MULTI');

INSERT INTO batch_items (batch_id, item_type, reference_id, item_order) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'FLOW', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 0),
    ('dddddddd-dddd-dddd-dddd-dddddddddd01', 'FLOW', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 1);

-- ============================================================
-- Batch 2: DATA_DRIVEN - runs flow 1 in parallel over N rows
-- Last row overrides expected_min_count=100 which should FAIL,
-- so the batch run ends with PARTIAL status.
-- ============================================================

INSERT INTO batches (id, owner_id, name, mode) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddd02',
     '00000000-0000-0000-0000-000000000001',
     'load-data-driven',
     'DATA_DRIVEN');

INSERT INTO batch_items (batch_id, item_type, reference_id, item_order) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'FLOW', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 0);

INSERT INTO batch_data_rows (batch_id, row_order, variables) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', 0, '{"expected_min_count":"1"}'::jsonb),
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', 1, '{"expected_min_count":"3"}'::jsonb),
    ('dddddddd-dddd-dddd-dddd-dddddddddd02', 2, '{"expected_min_count":"100"}'::jsonb);
