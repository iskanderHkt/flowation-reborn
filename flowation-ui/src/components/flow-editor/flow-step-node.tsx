import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'motion/react'
import { Badge } from '@/components/ui/badge.tsx'
import { cn } from '@/lib/cn.ts'
import { GitBranch, ChevronRight, ChevronDown } from 'lucide-react'
import type { FlowStep, ExecutionStatus } from '@/api/types.ts'

const STATUS_BORDER: Record<ExecutionStatus, string> = {
  COMPLETED: 'border-[var(--color-success)]',
  FAILED: 'border-[var(--color-error)]',
  SKIPPED: 'border-[var(--color-text-muted)]',
  RUNNING: 'border-[var(--color-accent)]',
  PENDING: 'border-[var(--color-border)]',
}

export interface FlowStepNodeData {
  step: FlowStep
  nestedFlowName: string
  selected: boolean
  executionStatus?: ExecutionStatus
  onDrillDown?: (flowId: string) => void
  expanded?: boolean
  onToggleExpand?: () => void
  [key: string]: unknown
}

export function FlowStepNode({ data }: NodeProps) {
  const d = data as unknown as FlowStepNodeData
  const statusBorder = d.executionStatus ? STATUS_BORDER[d.executionStatus] : 'border-[var(--color-accent-muted)]'

  return (
    <motion.div
      animate={{ scale: d.selected ? 1.03 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={cn(
        'min-w-[200px] rounded-[var(--radius-lg)] border-2 border-dashed bg-[var(--color-bg-tertiary)] shadow-lg',
        statusBorder,
        d.selected && 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-bg-primary)]',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent)] !w-2 !h-2 !border-0" />

      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-accent-subtle)] flex items-center justify-center shrink-0">
          <GitBranch size={13} className="text-[var(--color-accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
            {d.nestedFlowName}
          </div>
          <Badge variant="default" className="!text-[10px] !px-1.5 !py-0 mt-0.5">
            Sub-flow
          </Badge>
        </div>
        <div className="flex items-center gap-0.5">
          {d.step.nestedFlowId && d.onToggleExpand && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                d.onToggleExpand!()
              }}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              title={d.expanded ? 'Collapse sub-flow' : 'Expand sub-flow inline'}
            >
              {d.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {d.step.nestedFlowId && d.onDrillDown && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                d.onDrillDown!(d.step.nestedFlowId!)
              }}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
              title="Drill down into sub-flow"
            >
              <ChevronRight size={11} className="opacity-50" />
            </button>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent)] !w-2 !h-2 !border-0" />
    </motion.div>
  )
}
