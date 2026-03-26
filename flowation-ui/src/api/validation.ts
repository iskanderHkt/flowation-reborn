import { z } from 'zod'
import type { OperationConfig } from './types'

/* ── Atomic schemas ────────────────────────────────────── */

export const operationNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name too long')

export const httpConfigSchema = z.object({
  type: z.literal('HTTP_REQUEST'),
  method: z.string(),
  url: z.string().min(1, 'URL is required'),
  headers: z.record(z.string(), z.string()),
  body: z.string().optional(),
  timeoutMs: z.number().min(100, 'Min 100ms').max(300000, 'Max 5min').optional(),
})

export const sqlConfigSchema = z.object({
  type: z.literal('SQL_QUERY'),
  dbType: z.enum(['POSTGRES', 'MYSQL']),
  connectionString: z.string().min(1, 'Connection string is required'),
  query: z.string().min(1, 'Query is required'),
})

export const assertConfigSchema = z.object({
  type: z.literal('ASSERTION'),
  expression: z.string().min(1, 'Expression is required'),
  comparator: z.enum(['EQ', 'NEQ', 'CONTAINS', 'REGEX', 'GT', 'LT', 'IS_NULL']),
  expected: z.string(),
})

/* ── Combined discriminated union ──────────────────────── */

export const operationConfigSchema = z.discriminatedUnion('type', [
  httpConfigSchema,
  sqlConfigSchema,
  assertConfigSchema,
])

/* ── Full operation form schema ────────────────────────── */

export const operationFormSchema = z.object({
  name: operationNameSchema,
  config: operationConfigSchema,
})

/* ── Helper ────────────────────────────────────────────── */

/**
 * Validate an operation form payload.
 * Returns `null` when valid, or a flat `Record<fieldPath, errorMessage>` on failure.
 */
export function validateOperationForm(
  name: string,
  config: OperationConfig,
): Record<string, string> | null {
  const result = operationFormSchema.safeParse({ name, config })

  if (result.success) {
    return null
  }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    // keep only the first error per path
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }
  return errors
}
