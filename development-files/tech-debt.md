# Technical Debt & Roadmap

Items to address in future iterations. Ordered by priority — top sections should be tackled first.

---

## High Priority

### ~~SSE Execution Progress~~ ✅ DONE (backend)

**Files:** `execution/flow/FlowExecutionService.java`, `execution/InstantExecutionService.java`, `execution/stream/ExecutionStreamService.java`, `execution/stream/ExecutionStreamController.java`

**What was done:** Added async execution endpoints. `POST /api/flows/{flowId}/runs` and `POST /api/operations/{operationId}/runs` return 202 `{ runId }` immediately. `GET /api/executions/{runId}/stream` streams `step-completed` and `run-completed` SSE events via DB polling (300ms interval). Old sync `/execute` endpoints kept for backward compatibility until frontend migrates.

**Remaining:** Frontend migration (Phase 4.1 in `frontend-tech-debt.md`) — switch ExecutionPanel from sync POST to async POST + EventSource SSE stream.

---

## Priority 1 — Polish before any deployment

### ~~Executions Page~~ ✅ DONE

**Files:** `routes/executions/index.tsx`, `hooks/use-all-executions.ts`, `components/sidebar.tsx`, `router.tsx`

**What:** `/executions` route with unified history across all operations, flows, and batches. Filterable by type and status, paginated, clicking a row navigates to the entity's edit page.

---

### ~~Operation Groups (Catalog Organization)~~ ✅ DONE

**Files:** `catalog/OperationGroup.java`, `OperationGroupService`, `OperationGroupController`, `api/groups.ts`, `hooks/use-groups.ts`, `routes/operations/index.tsx`, `operation-form.tsx`

**What:** Full CRUD for groups. `group_id` FK added to `operations`. Catalog page shows group column, group filter select, and inline groups manager panel. Operation create/edit form has group selector.

---

## Priority 2 — Quality & Correctness

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

---

## Very-Future Priority

### Secret Variables

**Files:** `EnvVariable.java`, `EnvVariableRepository.java`, `environments/` frontend

**What:** Environment variables (API keys, passwords, DB credentials) are stored and returned as plain text.

**Future:** Encrypt sensitive values at-rest using AES-GCM with a master key from config (`flowation.secrets.master-key`). Add a `secret: boolean` flag to `EnvVariable`. Secret values are encrypted on write, decrypted on use (execution), and never returned in GET responses (masked as `"***"`). UI shows a lock icon for secret variables.
