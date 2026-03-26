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
  ownerId: string
  groupId: string | null
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
