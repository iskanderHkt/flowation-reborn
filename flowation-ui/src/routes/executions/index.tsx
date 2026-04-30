import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { useAllExecutions } from '@/hooks/use-all-executions.ts'
import type { EntityType, UnifiedExecution } from '@/hooks/use-all-executions.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Select } from '@/components/ui/select.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { usePagination } from '@/hooks/use-pagination.ts'
import { cn } from '@/lib/cn.ts'
import { Zap, GitBranch, Layers, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

/* ─── Status helpers ─────────────────────────────── */

type StatusVariant = 'success' | 'error' | 'warning' | 'muted' | 'info'

function statusVariant(status: string): StatusVariant {
  switch (status) {
    case 'COMPLETED': return 'success'
    case 'FAILED': return 'error'
    case 'PARTIAL': return 'warning'
    case 'RUNNING': return 'info'
    case 'SKIPPED': return 'muted'
    default: return 'muted'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'Completed'
    case 'FAILED': return 'Failed'
    case 'PARTIAL': return 'Partial'
    case 'RUNNING': return 'Running'
    case 'PENDING': return 'Pending'
    case 'SKIPPED': return 'Skipped'
    default: return status
  }
}

/* ─── Entity type helpers ────────────────────────── */

const ENTITY_ICONS: Record<EntityType, typeof Zap> = {
  OPERATION: Zap,
  FLOW: GitBranch,
  BATCH: Layers,
}

const ENTITY_LABELS: Record<EntityType, string> = {
  OPERATION: 'Operation',
  FLOW: 'Flow',
  BATCH: 'Batch',
}

function entityLink(e: UnifiedExecution): string {
  switch (e.entityType) {
    case 'OPERATION': return `/catalog/${e.entityId}`
    case 'FLOW': return `/flows/${e.entityId}`
    case 'BATCH': return `/batch/${e.entityId}`
  }
}

/* ─── Filter options ─────────────────────────────── */

const TYPE_OPTIONS: { value: EntityType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'OPERATION', label: 'Operations' },
  { value: 'FLOW', label: 'Flows' },
  { value: 'BATCH', label: 'Batches' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RUNNING', label: 'Running' },
  { value: 'PENDING', label: 'Pending' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

/* ─── Duration formatter ─────────────────────────── */

function formatDuration(ms: number | null): string {
  if (ms === null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

/* ─── Page ───────────────────────────────────────── */

export function ExecutionsPage() {
  const { executions, isLoading } = useAllExecutions()
  const [typeFilter, setTypeFilter] = useState<EntityType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const filtered = useMemo(() => {
    let result = executions
    if (typeFilter !== 'ALL') result = result.filter((e) => e.entityType === typeFilter)
    if (statusFilter !== 'ALL') result = result.filter((e) => e.status === statusFilter)
    return result
  }, [executions, typeFilter, statusFilter])

  const {
    page, pageSize, totalPages, setPage, setPageSize,
    startIndex, endIndex, paginate,
  } = usePagination({ totalItems: filtered.length, defaultPageSize: 25 })

  const paginated = paginate(filtered)

  const handleTypeChange = (v: string) => { setTypeFilter(v as EntityType | 'ALL'); setPage(0) }
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(0) }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Executions</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Unified history across all operations, flows, and batches
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          value={typeFilter}
          options={TYPE_OPTIONS}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-36 !h-7 !text-xs !py-0"
        />
        <Select
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-36 !h-7 !text-xs !py-0"
        />
        {!isLoading && (
          <span className="text-xs text-[var(--color-text-muted)] ml-auto">
            {executions.length} total executions
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-5 w-5" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
          No executions found.
        </div>
      ) : (
        <>
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Type</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Name</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Status</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Duration</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Started</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((exec) => {
                  const Icon = ENTITY_ICONS[exec.entityType]
                  return (
                    <tr
                      key={exec.runId}
                      className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                          <Icon size={12} />
                          {ENTITY_LABELS[exec.entityType]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          to={entityLink(exec) as '/'}
                          className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors font-medium text-sm"
                        >
                          {exec.entityName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={statusVariant(exec.status)}>
                          {statusLabel(exec.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-[var(--color-text-muted)]">
                        {formatDuration(exec.durationMs)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-[var(--color-text-muted)]">
                        {exec.startedAt
                          ? new Date(exec.startedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          to={entityLink(exec) as '/'}
                          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <Select
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-18 !h-7 !text-xs !py-0"
              />
            </div>
            <div className="flex items-center gap-3">
              <span>
                {filtered.length === 0
                  ? '0 of 0'
                  : `${startIndex + 1}–${endIndex} of ${filtered.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className={cn(
                    'p-1 rounded-[var(--radius-sm)] transition-colors',
                    page === 0 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
                  )}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className={cn(
                    'p-1 rounded-[var(--radius-sm)] transition-colors',
                    page >= totalPages - 1 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
                  )}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
