# Frontend Architecture Roadmap

Phased refactoring plan. Each phase has discrete steps — agent pauses after every step for review before continuing.

**Approach:** Hybrid FSD folder structure, shadcn/ui as the single component base, TanStack ecosystem throughout, React Compiler already active (no manual `useMemo`/`useCallback`/`memo` in new code).

---

## ~~Phase 1 — Foundation~~ ✅ DONE (2026-04-26)

Everything in this phase is structural. No new business logic. Goal: establish the patterns that all future code follows.

---

### ~~Step 1.1 — shadcn/ui Full Migration~~ ✅

**What:** Replace the entire custom component library with shadcn/ui. This is a full swap, not incremental — all components get migrated in one step.

**Why:** shadcn/ui = Radix UI primitives + Tailwind + CSS variables. The project already has all three. Future agents and developers see one consistent pattern and extend it without inventing new components.

**Scope:**
- Install Radix UI primitives and `cmdk`
- Adapt CSS custom properties in `index.css` to shadcn-compatible variable names (`--background`, `--foreground`, `--primary`, `--muted`, etc.) while preserving the violet dark theme
- Replace existing: `Button`, `Input`, `Select`, `Badge`, `Toast`, `Tabs`, `Spinner`
- Add missing components needed now or soon: `Dialog`, `Sheet`, `Tooltip`, `DropdownMenu`, `Popover`, `Combobox` (Command + Popover), `Accordion`, `Skeleton`
- Update all import paths across the codebase

**Files affected:** `components/ui/*`, `index.css`, every file importing from `@/components/ui`

---

### ~~Step 1.2 — Hybrid FSD Restructure~~ ✅

**What:** Reorganise the entire `src/` folder into a hybrid Feature-Sliced Design layout.

**Target structure:**
```
src/
  app/
    main.tsx          ← entry point
    providers.tsx     ← QueryClient, Router, Toast wrappers
    router.tsx        ← route tree
  features/
    catalog/
      api.ts          ← operationsApi + groupsApi
      hooks.ts        ← all useOperations*, useGroups* hooks
      schemas.ts      ← Zod schemas for operation forms
      components/
        OperationForm.tsx
        KeyValueEditor.tsx
        GroupPanel.tsx
      routes/
        index.tsx     ← /catalog
        new.tsx       ← /catalog/new
        $operationId.tsx
    flows/
      api.ts
      hooks.ts
      schemas.ts
      components/
        FlowEditor/   ← ReactFlow canvas + nodes
        StepPanel.tsx
        ExtractionRulePanel.tsx
      routes/
        index.tsx
        new.tsx
        $flowId.tsx
    environments/
      api.ts
      hooks.ts
      schemas.ts
      components/
      routes/
    batch/
      api.ts
      hooks.ts
      schemas.ts
      components/
      routes/
    executions/
      api.ts
      hooks.ts
      components/
      routes/
  shared/
    ui/               ← shadcn components only (output of Step 1.1)
    hooks/            ← useToast, usePagination, useSort
    lib/
      cn.ts
      api-error.ts    ← ApiError class (Step 1.3)
    types/            ← PageResult<T>, global shared types
    stores/           ← Zustand stores (Step 1.4)
```

**Rule:** Imports flow downward only — `features/*` can import from `shared/`, never from each other. Cross-feature communication goes through shared stores or query cache.

**Note:** `api/types.ts` splits — entity-specific types move into their feature, globally shared types stay in `shared/types/`.

---

### ~~Step 1.3 — API Error Class~~ ✅

**What:** Proper HTTP error parsing so toasts show real messages instead of `[object Object]` or raw strings.

**How:**
- Create `shared/lib/api-error.ts` — `ApiError` extends `Error`, carries `status`, `message`, optional `fields: Record<string, string>` for field-level validation errors
- Add `afterResponse` hook to ky client: catches `HTTPError`, parses backend JSON body, throws `ApiError`
- Update all mutation `onError` callbacks to use `error.message`
- For validation errors, propagate `error.fields` into form field errors (connects with Step 2.1)

**Backend error shape** (from `GlobalExceptionHandler`): `{ message, code?, fields? }`

---

### ~~Step 1.4 — Zustand Stores~~ ✅

**What:** Introduce Zustand for global UI state that doesn't belong in server cache or local component state.

**Stores to create in `shared/stores/`:**

`ui-store.ts`:
- `selectedEnvironmentId: string | null` — active environment for execution panels, persisted to localStorage via Zustand persist middleware
- `sidebarCollapsed: boolean` — persisted

`features/flows/stores/flow-editor-store.ts`:
- `selectedStepId: string | null`
- `panelMode: 'view' | 'edit'`

**Rule:** Zustand for UI state only. Server state stays in TanStack Query. No business logic in stores.

---

### ~~Step 1.5 — Code Splitting (Lazy Routes)~~ ✅

**What:** Heavy dependencies (ReactFlow ~500KB, CodeMirror ~400KB) should only load when the user navigates to the route that needs them — not on initial app load.

**How:** TanStack Router's `lazy()` on route components:
- `features/flows/routes/$flowId.tsx` — wraps ReactFlow + CodeMirror (heaviest)
- `features/catalog/routes/$operationId.tsx` — wraps CodeMirror
- `features/batch/routes/$batchId.tsx` — medium

Additionally, the `CodeEditor` component itself should use `React.lazy` internally so it doesn't block its parent route's initial render.

**Tooling:** Add `rollup-plugin-visualizer` to `vite.config.ts` — generates a bundle size report on build. Run once after this step to confirm the split worked.

---

### Step 1.6 — Query Key Factories

**What:** Standardise TanStack Query cache keys across all features using a factory pattern.

**Why:** Prevents typos across files, enables precise cache invalidation (invalidate all operation lists without touching detail caches, or vice versa).

**Pattern per feature:**
```typescript
export const operationKeys = {
  all: ['operations'] as const,
  lists: () => [...operationKeys.all, 'list'] as const,
  detail: (id: string) => [...operationKeys.all, 'detail', id] as const,
  executions: (id: string, page: number, size: number) =>
    [...operationKeys.detail(id), 'executions', { page, size }] as const,
}
```

**Done as part of Step 1.2** — when hooks move into features, rewrite keys using this factory at the same time. Not a separate migration, just a rule to apply during restructure.

---

## ~~Phase 2 — Forms & Tables~~ ✅ DONE (2026-04-26)

After Phase 1 is reviewed and stable.

---

### ~~Step 2.1 — TanStack Form: Infrastructure~~ ✅

**What:** Install and configure `@tanstack/react-form` + `@tanstack/zod-form-adapter`. Create the reusable field component wrappers.

**Shared field components to create in `shared/ui/form/`:**
- `FormField` — label + error message wrapper
- `FormInput` — Input bound to a TanStack Form field
- `FormSelect` — Select bound to a field
- `FormTextarea`
- `FormCodeEditor` — CodeMirror bound to a field
- `FormKeyValueEditor` — dynamic key-value pairs as array field

**Pattern:**
```typescript
const form = useForm({
  defaultValues: { name: '', config: defaultHttpConfig },
  onSubmit: ({ value }) => createMutation.mutateAsync(value),
  validators: { onSubmit: operationSchema },
})
```

Validation errors from `ApiError.fields` (Step 1.3) map directly into form field errors via `form.setFieldMeta`.

---

### ~~Step 2.2 — TanStack Form: Rewrite OperationForm~~ ✅

**What:** Rewrite `OperationForm` as the first production TanStack Form implementation. This becomes the reference pattern for all other forms.

**Covers:**
- Type switcher (HTTP / SQL / ASSERTION) with conditional sub-forms
- HTTP config: URL, method, headers (array field), body (CodeEditor field)
- SQL config: connection string, query (CodeEditor field)
- Assert config: source, condition, expected value
- Group selector
- Validation via Zod schema + field-level error display
- Lifted `onSubmit` to page level (form handles state, page handles mutation)

---

### ~~Step 2.3 — TanStack Form: Remaining Forms~~ ✅

**What:** Apply the same pattern to all other forms using Step 2.2 as the template.

Forms to rewrite:
- Flow create/edit form (name, description)
- Flow step form (type, operation selector, on_fail, config overrides)
- Environment form (name)
- Environment variables editor (array field)
- Batch create form (name, mode)
- Batch item add dialog
- Batch data row editor

---

### ~~Step 2.4 — TanStack Table~~ ✅

**What:** Replace ad-hoc HTML tables with TanStack Table v8.

**Install:** `@tanstack/react-table`

**Create `shared/ui/data-table.tsx`** — generic DataTable component accepting column definitions and data. Supports:
- Client-side sorting (clickable column headers)
- Column visibility toggle
- Row actions slot (DropdownMenu per row)
- Empty state slot
- Loading state with Skeleton rows

**Apply to (in priority order):**
1. Execution history tables (operations, flows, batches) — most data-heavy
2. Batch items list
3. Operation catalog list
4. Environments list

**TanStack Virtual** (`@tanstack/react-virtual`): Add row virtualisation to execution history and batch data rows editor when row count can exceed ~100. Install alongside but apply only where needed.

---

## Phase 3 — UX Polish

After Phase 2 is reviewed and stable.

---

### Step 3.1 — Optimistic Updates

**What:** Instant UI feedback on common mutations — no waiting for server round-trip.

**Priority targets:**
- Delete operation from catalog — row disappears immediately, rollback on error
- Inline rename (flow, operation, environment, batch) — name updates instantly
- Flow step reorder (drag & drop) — already feels instant via ReactFlow, but confirm server save
- Toggle/status changes if any get added in future

**Pattern:** TanStack Query `onMutate` → `queryClient.setQueryData` → `onError` rollback + `onSettled` invalidation.

---

### Step 3.2 — Skeleton Loading

**What:** Replace all spinner loading states with Skeleton placeholders that match the page layout.

**Use `<Skeleton />` from shadcn/ui** (added in Step 1.1).

**Create skeletons for:**
- Catalog list — skeleton rows matching table row height
- Operation detail page — skeleton form layout
- Flow editor — skeleton canvas area while graph loads
- Execution history — skeleton table rows
- Batch edit page — skeleton items list + run panel

**Rule:** If the shape of the content is known before data loads, use Skeleton. Use Spinner only for action feedback (button loading state during mutation).

---

### Step 3.3 — Animations (Motion)

**What:** Add lightweight transitions where they improve UX clarity. Functional-first — no decoration for its own sake.

**Install:** `motion` (Framer Motion v12, same package, new name)

**Where to apply:**
- Execution result panel slide-in (when run completes)
- Quick run drawer open/close
- Status badge transitions (PENDING → RUNNING → COMPLETED) — subtle colour + opacity
- Toast enter/exit (currently CSS only, Motion gives more control)
- Step node selection highlight in flow editor

**Not to animate:** List reorders, table rows, navigation transitions — these should be instant.

**AutoAnimate** (`@formkit/auto-animate`): For list item add/remove animations (batch items, flow steps). One hook call on the container ref.

---

## Phase 4 — Real-time

Depends on backend SSE implementation (tracked in `tech-debt.md`).

---

### Step 4.1 — SSE Execution Progress

**What:** Replace polling on flow/operation execution with SSE streaming. Batch already polls; migrate batch to SSE as well.

**Frontend pattern:**
```typescript
function useExecutionProgress(runId: string | null) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!runId) return
    const es = new EventSource(`/api/executions/${runId}/progress`)
    es.onmessage = (e) => {
      queryClient.setQueryData(executionKeys.detail(runId), (old) =>
        mergeProgressUpdate(old, JSON.parse(e.data))
      )
    }
    return () => es.close()
  }, [runId, queryClient])
}
```

No new libraries. Native `EventSource` + TanStack Query cache mutations.

**Migrate:** `useBatchRun` polling → SSE hook once backend endpoint is available.

---

## Phase 5 — Quality Assurance

After architecture is stable and all phases above are reviewed.

---

### Step 5.1 — Testing Infrastructure

**What:** Set up the full testing stack.

**Install:**
- `vitest` + `@vitest/ui` — test runner (native Vite integration)
- `@testing-library/react` + `@testing-library/user-event` — component testing
- `msw` — API mocking via Service Worker (same handlers work in tests and dev)
- `@playwright/test` — E2E

**Start with:**
- Unit: Zod schemas, `ApiError` parser, `cn()`, `usePagination`, `useSort`
- Integration: Form validation flows (OperationForm submit → validation errors → fix → success)
- E2E (Playwright): Create operation → execute → check result; Create batch → run → check status

---

## Rules That Apply to All Phases

- **No `useMemo` / `useCallback` / `memo()`** in new code — React Compiler handles this automatically
- **No custom UI components** outside `shared/ui/` — all components go through shadcn/ui base
- **No cross-feature imports** — features only import from `shared/`
- **All new forms** use TanStack Form + Zod schema (after Phase 2.1)
- **All new tables** use TanStack Table (after Phase 2.4)
- **Error display** always uses `ApiError.message` / `ApiError.fields` (after Phase 1.3)
- **startTransition** for non-urgent updates (search/filter on large lists)
