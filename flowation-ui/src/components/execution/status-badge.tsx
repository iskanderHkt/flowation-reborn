import type { ExecutionStatus } from '@/api/types.ts'

export const STATUS_BADGE: Record<ExecutionStatus, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'muted' }> = {
  PENDING: { label: 'Pending', variant: 'muted' },
  RUNNING: { label: 'Running', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'error' },
  SKIPPED: { label: 'Skipped', variant: 'muted' },
}
