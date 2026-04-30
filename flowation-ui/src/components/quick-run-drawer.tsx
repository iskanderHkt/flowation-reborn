import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { useExecuteOperation, useExecutionHistory } from '@/hooks/use-operations.ts'
import { ResultView } from '@/components/execution-panel.tsx'
import { CodeEditor } from '@/components/code-editor.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { cn } from '@/lib/cn.ts'
import { X, Play, Pencil, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import type { Operation, OperationType, OperationConfig, ExecutionResult } from '@/api/types.ts'

const DRAWER_MIN_W = 480
const DRAWER_DEFAULT_W = 680
const DRAWER_MAX_RATIO = 0.75

const TYPE_LABELS: Record<OperationType, { label: string; variant: 'default' | 'info' | 'warning' }> = {
  HTTP_REQUEST: { label: 'HTTP Request', variant: 'default' },
  SQL_QUERY: { label: 'SQL Query', variant: 'info' },
  ASSERTION: { label: 'Assertion', variant: 'warning' },
}

interface QuickRunDrawerProps {
  operation: Operation | null
  onClose: () => void
}

export function QuickRunDrawer({ operation, onClose }: QuickRunDrawerProps) {
  const operationId = operation?.id ?? ''
  const executeMutation = useExecuteOperation(operationId)
  const { data: historyPage, isLoading: historyLoading } = useExecutionHistory(operationId)
  const history = historyPage?.content ?? []

  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [width, setWidth] = useState(DRAWER_DEFAULT_W)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  // Reset result when switching operation
  useEffect(() => {
    setLastResult(null)
  }, [operationId])

  const handleRun = async () => {
    if (!operationId) return
    const result = await executeMutation.mutateAsync()
    setLastResult(result)
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startW.current = width
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [width])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const maxW = window.innerWidth * DRAWER_MAX_RATIO
    const delta = startX.current - e.clientX
    const newW = Math.min(maxW, Math.max(DRAWER_MIN_W, startW.current + delta))
    setWidth(newW)
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          operation ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-full bg-[var(--color-bg-primary)] border-l border-[var(--color-border)] shadow-2xl',
          'transform transition-transform duration-200 ease-out',
          operation ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ width }}
      >
        {/* Resize handle — left edge */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-[var(--color-accent)]/30 active:bg-[var(--color-accent)]/40 transition-colors"
        />
        {operation && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <Badge variant={TYPE_LABELS[operation.type].variant}>
                  {TYPE_LABELS[operation.type].label}
                </Badge>
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {operation.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  to="/catalog/$operationId"
                  params={{ operationId: operation.id }}
                >
                  <Button variant="ghost" size="sm" title="Edit operation">
                    <Pencil size={13} />
                  </Button>
                </Link>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Run bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/50 shrink-0">
              <Button
                size="sm"
                onClick={handleRun}
                disabled={executeMutation.isPending}
              >
                {executeMutation.isPending ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <Play size={13} />
                )}
                {executeMutation.isPending ? 'Running...' : 'Run'}
              </Button>
              {lastResult && (
                <span className="text-xs text-[var(--color-text-muted)]">
                  {lastResult.durationMs}ms
                </span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto min-h-0">
              {/* Config preview */}
              <ConfigPreview config={operation.configTemplate} />

              {/* Result */}
              {executeMutation.isPending && !lastResult && (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-5 w-5" />
                </div>
              )}

              {lastResult && (
                <div className="border-t border-[var(--color-border)]">
                  <div className="px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Result</span>
                  </div>
                  <div className="p-2">
                    <ResultView result={lastResult} compact={false} />
                  </div>
                </div>
              )}

              {/* History — always visible */}
              {!executeMutation.isPending && (
                <RecentHistory history={history} isLoading={historyLoading} />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/* ─── Config Preview ──────────────────────────────── */

function ConfigPreview({ config }: { config: OperationConfig }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-b border-[var(--color-border)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-4 py-2 w-full text-left bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Configuration</span>
      </button>
      {expanded && (
        <div className="px-4 py-3">
          {config.type === 'HTTP_REQUEST' && <HttpPreview config={config} />}
          {config.type === 'SQL_QUERY' && <SqlPreview config={config} />}
          {config.type === 'ASSERTION' && <AssertPreview config={config} />}
        </div>
      )}
    </div>
  )
}

function HttpPreview({ config }: { config: Extract<OperationConfig, { type: 'HTTP_REQUEST' }> }) {
  const methodColors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-yellow-400',
    PUT: 'text-blue-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
  }

  const headerEntries = Object.entries(config.headers)

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-bold font-mono', methodColors[config.method] ?? 'text-[var(--color-text-primary)]')}>
          {config.method}
        </span>
        <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate">
          {config.url}
        </span>
      </div>
      {headerEntries.length > 0 && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">Headers</span>
          <div className="flex flex-col gap-0.5">
            {headerEntries.map(([k, v]) => (
              <div key={k} className="text-xs font-mono">
                <span className="text-[var(--color-text-muted)]">{k}:</span>{' '}
                <span className="text-[var(--color-text-secondary)]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {config.body && (
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">Body</span>
          <CodeEditor value={config.body} language="json" readOnly minHeight="60px" />
        </div>
      )}
    </div>
  )
}

function SqlPreview({ config }: { config: Extract<OperationConfig, { type: 'SQL_QUERY' }> }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Badge variant="info">{config.dbType === 'POSTGRES' ? 'PostgreSQL' : 'MySQL'}</Badge>
        <span className="text-xs font-mono text-[var(--color-text-muted)] truncate">
          {config.connectionString}
        </span>
      </div>
      <div>
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1 block">Query</span>
        <CodeEditor value={config.query} language="sql" readOnly minHeight="60px" />
      </div>
    </div>
  )
}

function AssertPreview({ config }: { config: Extract<OperationConfig, { type: 'ASSERTION' }> }) {
  return (
    <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
      <span className="text-[var(--color-text-secondary)]">{config.expression}</span>
      <Badge variant="muted">{config.comparator}</Badge>
      <span className="text-[var(--color-text-secondary)]">{config.expected}</span>
    </div>
  )
}

/* ─── Recent History ──────────────────────────────── */

function RecentHistory({ history, isLoading }: { history: ExecutionResult[]; isLoading: boolean }) {
  const recent = history.slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  if (!recent.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-[var(--color-text-muted)]">
        <Play size={20} className="mb-2 opacity-40" />
        <span className="text-xs">No executions yet. Hit Run to get started.</span>
      </div>
    )
  }

  return (
    <div className="border-t border-[var(--color-border)]">
      <div className="px-4 py-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Recent Runs</span>
      </div>
      <div className="flex flex-col">
        {recent.map((r) => (
          <HistoryRow key={r.runId} result={r} />
        ))}
      </div>
    </div>
  )
}

function HistoryRow({ result }: { result: ExecutionResult }) {
  const [expanded, setExpanded] = useState(false)
  const statusColor =
    result.status === 'COMPLETED' ? 'text-green-400' :
    result.status === 'FAILED' ? 'text-red-400' : 'text-[var(--color-text-muted)]'

  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
      >
        {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className={cn('text-xs font-medium', statusColor)}>
          {result.status}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 ml-auto">
          <Clock size={10} />
          {result.durationMs}ms
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)]">
          {new Date(result.startedAt).toLocaleTimeString()}
        </span>
      </button>
      {expanded && (
        <div className="px-2 pb-2">
          <ResultView result={result} compact />
        </div>
      )}
    </div>
  )
}
