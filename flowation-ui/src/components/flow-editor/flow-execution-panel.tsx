import { useState } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { Tabs } from '@/components/ui/tabs.tsx'
import { ChevronDown, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn.ts'
import { HttpResultView } from '@/components/execution/http-result-view.tsx'
import { SqlResultView } from '@/components/execution/sql-result-view.tsx'
import { AssertResultView } from '@/components/execution/assert-result-view.tsx'
import type { FlowExecutionResult, StepResultResponse, ExecutionStatus } from '@/api/types.ts'

const STATUS_VARIANT: Record<ExecutionStatus, 'success' | 'error' | 'muted' | 'warning' | 'info'> = {
  COMPLETED: 'success',
  FAILED: 'error',
  SKIPPED: 'muted',
  RUNNING: 'info',
  PENDING: 'muted',
}

const STATUS_STRIPE: Record<ExecutionStatus, string> = {
  COMPLETED: 'border-l-green-500',
  FAILED: 'border-l-red-500',
  SKIPPED: 'border-l-[var(--color-border)]',
  RUNNING: 'border-l-blue-400',
  PENDING: 'border-l-[var(--color-border)]',
}

interface FlowExecutionPanelProps {
  latestResult: FlowExecutionResult | undefined
  history: FlowExecutionResult[]
  onStepClick?: (stepRefId: string) => void
}

export function FlowExecutionPanel({ latestResult, history, onStepClick }: FlowExecutionPanelProps) {
  const [activeTab, setActiveTab] = useState('result')

  return (
    <div className="flex flex-col h-full">
      <Tabs
        tabs={[
          { id: 'result', label: 'Result' },
          { id: 'history', label: `History (${history.length})` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'result' ? (
          latestResult ? (
            <ExecutionResultView result={latestResult} onStepClick={onStepClick} />
          ) : (
            <div className="text-xs text-[var(--color-text-muted)] py-8 text-center">
              Run the flow to see results
            </div>
          )
        ) : (
          <HistoryList history={history} onStepClick={onStepClick} />
        )}
      </div>
    </div>
  )
}

/* ─── Flow summary + steps ──────────────────────────── */

function ExecutionResultView({
  result,
  onStepClick,
}: {
  result: FlowExecutionResult
  onStepClick?: (stepRefId: string) => void
}) {
  return (
    <div className="p-3 flex flex-col gap-2">
      {/* Summary — visually distinct from step rows */}
      <div className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] border-l-4 bg-[var(--color-bg-elevated)] border border-[var(--color-border)]',
        STATUS_STRIPE[result.status],
      )}>
        <Badge variant={STATUS_VARIANT[result.status]}>{result.status}</Badge>
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono flex items-center gap-1">
          <Clock size={10} />
          {result.totalDurationMs}ms
        </span>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          {result.steps.length} steps
        </span>
        {result.completedAt && (
          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto font-mono">
            {new Date(result.completedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Step rows */}
      <div className="flex flex-col gap-1">
        {result.steps.map((step) => (
          <StepResultRow key={step.stepIndex} step={step} onStepClick={onStepClick} />
        ))}
      </div>
    </div>
  )
}

/* ─── Individual step row ───────────────────────────── */

function StepResultRow({
  step,
  onStepClick,
}: {
  step: StepResultResponse
  onStepClick?: (stepRefId: string) => void
}) {
  const [expanded, setExpanded] = useState(step.status === 'FAILED')

  const hasDetail = !!(step.errorMessage || step.requestSnapshot || step.responseSnapshot)

  return (
    <div className={cn(
      'rounded-[var(--radius-md)] border overflow-hidden',
      step.status === 'FAILED'
        ? 'border-red-500/30'
        : 'border-[var(--color-border-subtle)]',
    )}>
      {/* Header */}
      <button
        onClick={() => {
          if (hasDetail) setExpanded(!expanded)
          if (step.stepRefId && onStepClick) onStepClick(step.stepRefId)
        }}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
      >
        {hasDetail ? (
          expanded
            ? <ChevronDown size={11} className="text-[var(--color-text-muted)] shrink-0" />
            : <ChevronRight size={11} className="text-[var(--color-text-muted)] shrink-0" />
        ) : (
          <span className="w-[11px] shrink-0" />
        )}
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono w-5 shrink-0">
          #{step.stepIndex}
        </span>
        <Badge variant={STATUS_VARIANT[step.status]} className="!text-[10px] !px-1.5 !py-0">
          {step.status}
        </Badge>
        {step.durationMs != null && (
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono ml-auto">
            {step.durationMs}ms
          </span>
        )}
        {step.status === 'FAILED' && (
          <AlertTriangle size={11} className="text-[var(--color-error)] shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && hasDetail && (
        <div className="px-3 py-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]">
          {step.errorMessage && (
            <div className="mb-2.5 px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 font-mono break-all">
              {step.errorMessage}
            </div>
          )}
          {step.requestSnapshot && (
            <StepSnapshotView
              request={step.requestSnapshot}
              response={step.responseSnapshot}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Smart snapshot renderer (reuses operation views) ── */

function StepSnapshotView({
  request,
  response,
}: {
  request: Record<string, unknown>
  response: Record<string, unknown> | null
}) {
  const isSql = 'query' in request && 'dbType' in request
  const isAssert = 'expression' in request && 'comparator' in request

  if (isSql) return <SqlResultView request={request} response={response ?? {}} />
  if (isAssert) return <AssertResultView request={request} response={response} />
  return <HttpResultView request={request} response={response ?? {}} />
}

/* ─── History list ──────────────────────────────────── */

function HistoryList({
  history,
  onStepClick,
}: {
  history: FlowExecutionResult[]
  onStepClick?: (stepRefId: string) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (history.length === 0) {
    return (
      <div className="text-xs text-[var(--color-text-muted)] py-8 text-center">
        No execution history
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {history.map((run) => (
        <div key={run.runId} className="border-b border-[var(--color-border-subtle)]">
          <button
            onClick={() => setExpandedId(expandedId === run.runId ? null : run.runId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
          >
            {expandedId === run.runId
              ? <ChevronDown size={12} className="text-[var(--color-text-muted)]" />
              : <ChevronRight size={12} className="text-[var(--color-text-muted)]" />
            }
            <Badge variant={STATUS_VARIANT[run.status]} className="!text-[10px]">
              {run.status}
            </Badge>
            <span className="text-[11px] text-[var(--color-text-muted)] font-mono flex items-center gap-1">
              <Clock size={10} />
              {run.totalDurationMs}ms
            </span>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {run.steps.length} steps
            </span>
            <span className="text-[10px] text-[var(--color-text-muted)] ml-auto font-mono">
              {run.completedAt ? new Date(run.completedAt).toLocaleString() : '—'}
            </span>
          </button>

          {expandedId === run.runId && (
            <ExecutionResultView result={run} onStepClick={onStepClick} />
          )}
        </div>
      ))}
    </div>
  )
}
