import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Plus } from 'lucide-react'

export interface AddStepNodeData {
  onAdd: () => void
  [key: string]: unknown
}

export function AddStepNode({ data }: NodeProps) {
  const d = data as unknown as AddStepNodeData

  return (
    <div className="flex items-center justify-center">
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-border)] !w-2 !h-2 !border-0" />

      <button
        onClick={d.onAdd}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors cursor-pointer"
      >
        <Plus size={13} />
        Add Step
      </button>
    </div>
  )
}
