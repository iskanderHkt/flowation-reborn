/* ── Operation Types ─────────────────────────────────── */

export type OperationType = 'HTTP_REQUEST' | 'SQL_QUERY' | 'ASSERTION'

export interface HttpOperationConfig {
  type: 'HTTP_REQUEST'
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  timeoutMs?: number
}

export interface SqlOperationConfig {
  type: 'SQL_QUERY'
  dbType: 'POSTGRES' | 'MYSQL'
  connectionString: string
  query: string
}

export interface AssertOperationConfig {
  type: 'ASSERTION'
  expression: string
  comparator: 'EQ' | 'NEQ' | 'CONTAINS' | 'REGEX' | 'GT' | 'LT' | 'IS_NULL'
  expected: string
}

export type OperationConfig =
  | HttpOperationConfig
  | SqlOperationConfig
  | AssertOperationConfig

export interface Operation {
  id: string
  name: string
  type: OperationType
  configTemplate: OperationConfig
  createdAt: string
  updatedAt: string
}

export interface OperationCreateRequest {
  name: string
  config: OperationConfig
}

export interface OperationUpdateRequest {
  name: string
  config: OperationConfig
}

/* ── Execution Types ────────────────────────────────── */

export type RunMode = 'INSTANT' | 'FLOW' | 'BATCH'
export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'

export interface ExecutionResult {
  runId: string
  operationId: string
  runMode: RunMode
  status: ExecutionStatus
  startedAt: string
  completedAt: string
  durationMs: number
  requestSnapshot: Record<string, unknown>
  responseSnapshot: Record<string, unknown> | null
  errorMessage: string | null
}

/* ── Flow Types ───────────────────────────────────── */

export type StepKind = 'OPERATION_STEP' | 'FLOW_STEP'
export type Binding = 'LINKED' | 'DETACHED'
export type OnFailStrategy = 'STOP_FLOW' | 'SKIP_AND_CONTINUE'

export interface Flow {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface FlowCreateRequest {
  name: string
  description?: string
}

export interface FlowUpdateRequest {
  name: string
  description?: string
}

export interface FlowStep {
  id: string
  flowId: string
  stepOrder: number
  stepKind: StepKind
  binding: Binding | null
  operationId: string | null
  configOverride: OperationConfig | null
  ownConfig: OperationConfig | null
  sourceOperationId: string | null
  nestedFlowId: string | null
  onFail: OnFailStrategy
}

export interface FlowStepCreateRequest {
  stepKind: StepKind
  binding?: Binding
  operationId?: string
  configOverride?: OperationConfig
  ownConfig?: OperationConfig
  sourceOperationId?: string
  nestedFlowId?: string
  onFail?: OnFailStrategy
}

export interface FlowStepUpdateRequest {
  stepKind: StepKind
  binding?: Binding
  operationId?: string
  configOverride?: OperationConfig
  ownConfig?: OperationConfig
  sourceOperationId?: string
  nestedFlowId?: string
  onFail?: OnFailStrategy
}

export interface ReorderEntry {
  stepId: string
  newOrder: number
}

export interface ExtractionRule {
  id: string
  flowStepId: string
  sourcePath: string
  targetVariable: string
  ruleOrder: number
}

export interface ExtractionRuleCreateRequest {
  sourcePath: string
  targetVariable: string
}

export interface ExtractionRuleUpdateRequest {
  sourcePath: string
  targetVariable: string
}

/* ── Environment Types ───────────────────────────── */

export interface EnvVariableEntry {
  id: string
  key: string
  value: string
}

export interface Environment {
  id: string
  name: string
  variables: EnvVariableEntry[]
  createdAt: string
  updatedAt: string
}

export interface EnvironmentCreateRequest {
  name: string
}

export interface EnvironmentUpdateRequest {
  name: string
}

export interface UpsertVariablesRequest {
  variables: { key: string; value: string }[]
}

/* ── Pagination ───────────────────────────────────── */

export interface PageResult<T> {
  content: T[]
  total: number
  page: number
  size: number
}

/* ── Batch Types ──────────────────────────────────── */

export type BatchMode = 'MULTI' | 'DATA_DRIVEN'
export type BatchItemType = 'FLOW' | 'OPERATION'
export type BatchRunStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

export interface BatchItemEntry {
  id: string
  itemType: BatchItemType
  referenceId: string
  itemOrder: number
}

export interface BatchDataRowEntry {
  id: string
  rowOrder: number
  variables: Record<string, unknown>
}

export interface Batch {
  id: string
  name: string
  mode: BatchMode
  items: BatchItemEntry[]
  dataRows: BatchDataRowEntry[]
  createdAt: string
  updatedAt: string
}

export interface BatchCreateRequest {
  name: string
  mode: BatchMode
}

export interface BatchUpdateRequest {
  name: string
}

export interface BatchItemRequest {
  itemType: BatchItemType
  referenceId: string
}

export interface SetBatchItemsRequest {
  items: BatchItemRequest[]
}

export interface SetBatchDataRowsRequest {
  rows: Record<string, unknown>[]
}

export interface BatchRunItemResult {
  itemType: BatchItemType
  referenceId: string
  name: string
  executionRunId: string
  status: ExecutionStatus
  durationMs: number | null
}

export interface BatchRun {
  id: string
  batchId: string
  status: BatchRunStatus
  startedAt: string | null
  completedAt: string | null
  items: BatchRunItemResult[]
}

export interface BatchStartResponse {
  runId: string
  batchId: string
}

/* ── Flow Execution Types ─────────────────────────── */

export interface StepResultResponse {
  stepIndex: number
  stepRefId: string | null
  status: ExecutionStatus
  requestSnapshot: Record<string, unknown> | null
  responseSnapshot: Record<string, unknown> | null
  errorMessage: string | null
  durationMs: number | null
  startedAt: string | null
  completedAt: string | null
}

export interface FlowExecutionResult {
  runId: string
  flowId: string
  runMode: RunMode
  status: ExecutionStatus
  startedAt: string
  completedAt: string
  totalDurationMs: number
  steps: StepResultResponse[]
}
