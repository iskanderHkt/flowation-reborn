import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Badge } from '@/components/ui/badge.tsx'
import { cn } from '@/lib/cn.ts'
import { Zap, Database, ShieldCheck, AlertTriangle, SkipForward } from 'lucide-react'
import type { FlowStep, OperationType, ExecutionStatus } from '@/api/types.ts'

const TYPE_ICON: Record<OperationType, typeof Zap> = {
  HTTP_REQUEST: Zap,
  SQL_QUERY: Database,
  ASSERTION: ShieldCheck,
}

const TYPE_LABEL: Record<OperationType, string> = {
  HTTP_REQUEST: 'HTTP',
  SQL_QUERY: 'SQL',
  ASSERTION: 'Assert',
}

const TYPE_BADGE_VARIANT: Record<OperationType, 'default' | 'info' | 'warning'> = {
  HTTP_REQUEST: 'default',
  SQL_QUERY: 'info',
  ASSERTION: 'warning',
}

const STATUS_BORDER: Record<ExecutionStatus, string> = {
  COMPLETED: 'border-[var(--color-success)]',
  FAILED: 'border-[var(--color-error)]',
  SKIPPED: 'border-[var(--color-text-muted)]',
  RUNNING: 'border-[var(--color-accent)]',
  PENDING: 'border-[var(--color-border)]',
}

export interface OperationStepNodeData {
  step: FlowStep
  operationName: string
  operationType: OperationType
  selected: boolean
  executionStatus?: ExecutionStatus
  isSubFlowChild?: boolean
  [key: string]: unknown
}

export function OperationStepNode({ data }: NodeProps) {
  const d = data as unknown as OperationStepNodeData
  const Icon = TYPE_ICON[d.operationType] ?? Zap
  const statusBorder = d.executionStatus ? STATUS_BORDER[d.executionStatus] : 'border-[var(--color-border)]'

  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-[var(--radius-lg)] border-2 bg-[var(--color-bg-secondary)] shadow-lg transition-all',
        statusBorder,
        d.selected && 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg-primary)]',
      )}
    >
      {d.isSubFlowChild && (
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-accent)] rounded-l-[var(--radius-lg)] opacity-60" />
      )}
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent)] !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-bg-elevated)] flex items-center justify-center shrink-0">
          <Icon size={13} className="text-[var(--color-text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {d.operationName}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant={TYPE_BADGE_VARIANT[d.operationType]} className="!text-[10px] !px-1.5 !py-0">
              {TYPE_LABEL[d.operationType]}
            </Badge>
            {d.step.binding === 'DETACHED' && (
              <span className="text-[10px] text-[var(--color-text-muted)]">detached</span>
            )}
            {d.step.onFail === 'SKIP_AND_CONTINUE' && (
              <SkipForward size={10} className="text-[var(--color-warning)]" title="Skip on fail" />
            )}
          </div>
        </div>
        {d.executionStatus === 'FAILED' && (
          <AlertTriangle size={14} className="text-[var(--color-error)] shrink-0" />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent)] !w-2 !h-2 !border-0" />
    </div>
  )
}
