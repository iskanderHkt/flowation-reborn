# Technical Debt & Roadmap

Items to address in future iterations. Ordered by priority — top sections should be tackled first.

---

## Priority 1 — Polish before any deployment

### Pagination UI

**Files:** `routes/operations/index.tsx`, `routes/flows/index.tsx`, `routes/batch/index.tsx`, execution history panels

**What:** Backend returns paginated `PageResult<T>` with `total`/`page`/`size`, but the frontend never renders next/prev controls. Only the first page is ever loaded.

**Future:** Add a reusable `<Pagination />` component. Wire it into all list pages and history panels. History panels (ExecutionPanel, FlowExecutionPanel, batch RunHistory) should show a "load more" or page selector once `total > size`.

---

### SSE Execution Progress

**Files:** `FlowExecutionService.java`, `InstantExecutionService.java`, `routes/flows/edit.tsx`, `routes/operations/edit.tsx`

**What:** All execution is synchronous — the UI blocks waiting for the HTTP response. For long-running flows this means a frozen "Run" button with no feedback. Batches already use async 202+polling, flows and operations do not.

**Future:** Make flow/operation execution async like batches: `POST /execute` returns `{ runId }` immediately (202), client polls or subscribes via SSE. Add a `/executions/{runId}/stream` SSE endpoint that pushes step-by-step progress events. Frontend shows live step statuses as they complete.

---

### Executions Page

**Files:** `components/sidebar.tsx` (item disabled), no route exists

**What:** There's a disabled "Executions" item in the sidebar. No global execution history page exists. Users can only see history per-operation or per-flow.

**Future:** Add `/executions` route with a unified history table: filterable by status, type (INSTANT/FLOW/BATCH), date range. Paginated. Clicking a row opens the full result detail.

---

### Secret Variables

**Files:** `EnvVariable.java`, `EnvVariableRepository.java`, `environments/` frontend

**What:** Environment variables (API keys, passwords, DB credentials) are stored and returned as plain text.

**Future:** Encrypt sensitive values at-rest using AES-GCM with a master key from config (`flowation.secrets.master-key`). Add a `secret: boolean` flag to `EnvVariable`. Secret values are encrypted on write, decrypted on use (execution), and never returned in GET responses (masked as `"***"`). UI shows a lock icon for secret variables.

---

### Operation Groups (Catalog Organization)

**Files:** `operation_groups` table (created, unused), `catalog/` module

**What:** The `operation_groups` table exists in the schema but has no service, controller, or UI. As the catalog grows, flat listing becomes hard to navigate.

**Future:** Implement group CRUD, add `group_id` FK to `operations`, add group filter/tree in the catalog sidebar. Optional: drag-and-drop reordering within groups.

---

## Priority 2 — Quality & Correctness

### HTTP 4xx/5xx Treated as Success

**File:** `HttpOperationExecutor.java`

**What:** HTTP responses with 4xx or 5xx status codes result in `StepResult.success()`. The actual status check must be done via a separate ASSERTION step. This is intentional but unintuitive.

**Why left as-is:** Separating transport from assertion is architecturally cleaner and more flexible — users can assert on specific status codes, not just "not an error".

**Future:** Consider a per-operation flag `"failOnHttpError": true` that auto-fails the step on 4xx/5xx without needing an explicit assertion. Default `false` to preserve current behavior.

---

### Soft Delete

**Files:** `OperationService`, `FlowService`, `EnvironmentService`, `BatchService`

**What:** All entities are hard-deleted. Deleted operations/flows cannot be recovered, and execution history referencing them loses the name/config context.

**Future:** Add `deleted_at TIMESTAMP` column to `operations`, `flows`, `batches`, `environments`. Filter `deleted_at IS NULL` in all list/findById queries. Add a "restore" endpoint or just rely on the timestamp for auditing.

---

## Priority 3 — Infrastructure (post-functional-polish)

### Auth & Multi-Tenancy

**Files:** `shared/TenantContext.java`, `shared/DevContext.java`, all `findById` calls in services

**What:** `DevContext` always returns a hardcoded owner UUID. No authentication, no user accounts, no isolation between users.

**Why deferred:** Flowation is targeting SaaS. Auth needs a serious approach — Keycloak or a custom solution with fine-grained object-level access control (who can view/edit/run which flows, environments, batches). This is a next-level stage after all core functionality is polished.

**Future:** Replace `DevContext` with JWT-based `TenantContext`. Add `findByIdAndOwnerId` variants in all repositories. Consider object-level ACLs (share a flow with another user, read-only vs edit permissions). Tenant isolation in all service `findById` calls (see item below).

---

### Tenant Isolation in findById

**Files:** `EnvironmentService`, `FlowService`, `OperationService`, `BatchService`

**What:** `findById(UUID id)` queries by ID only, without filtering by `ownerId`. A request with a valid UUID belonging to another tenant would succeed.

**Why left as-is:** Currently `DevContext` always returns a fixed owner ID — effectively a single-user system. No real multi-tenancy yet.

**Future:** When auth is introduced, replace all `findById` calls with `findByIdAndOwnerId` (or equivalent). Alternatively, enforce at the repository query level with a `@Query` annotation. Resolves automatically alongside the Auth item above.

---

### SSL Certificate Verification

**File:** `HttpOperationExecutor.java` — `buildTrustAllSslContext()`

**What:** All HTTPS requests skip certificate validation (trust-all `X509TrustManager`).

**Why left as-is:** Testing tool targets dev/staging environments that commonly use self-signed certs. Strict validation would break a common use case.

**Future:** Make it a per-operation option (`"skipSslVerification": true/false`). Default to `false` (strict) once UI supports it.
