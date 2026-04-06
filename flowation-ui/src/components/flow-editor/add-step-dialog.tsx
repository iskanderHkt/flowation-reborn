import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Select } from '@/components/ui/select.tsx'
import { X, Zap, GitBranch, Link, Unlink } from 'lucide-react'
import type { Operation, Flow, StepKind, Binding, FlowStepCreateRequest, OnFailStrategy } from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

interface AddStepDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (request: FlowStepCreateRequest) => void
  operations: Operation[]
  flows: Flow[]
  currentFlowId: string
}

export function AddStepDialog({ open, onClose, onAdd, operations, flows, currentFlowId }: AddStepDialogProps) {
  const [stepKind, setStepKind] = useState<StepKind>('OPERATION_STEP')
  const [binding, setBinding] = useState<Binding>('LINKED')
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [selectedFlowId, setSelectedFlowId] = useState('')
  const [onFail, setOnFail] = useState<OnFailStrategy>('STOP_FLOW')

  if (!open) return null

  const availableFlows = flows.filter((f) => f.id !== currentFlowId)

  const handleSubmit = () => {
    if (stepKind === 'OPERATION_STEP') {
      if (!selectedOperationId) return
      if (binding === 'LINKED') {
        onAdd({ stepKind: 'OPERATION_STEP', binding: 'LINKED', operationId: selectedOperationId, onFail })
      } else {
        onAdd({ stepKind: 'OPERATION_STEP', binding: 'DETACHED', sourceOperationId: selectedOperationId, onFail })
      }
    } else {
      if (!selectedFlowId) return
      onAdd({ stepKind: 'FLOW_STEP', nestedFlowId: selectedFlowId, onFail })
    }
    // reset
    setSelectedOperationId('')
    setSelectedFlowId('')
    setOnFail('STOP_FLOW')
    setBinding('LINKED')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add Step</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 flex flex-col gap-4">
          {/* Step Kind toggle */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
              Step Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setStepKind('OPERATION_STEP')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors cursor-pointer',
                  stepKind === 'OPERATION_STEP'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
                )}
              >
                <Zap size={14} />
                Operation
              </button>
              <button
                onClick={() => setStepKind('FLOW_STEP')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors cursor-pointer',
                  stepKind === 'FLOW_STEP'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
                )}
              >
                <GitBranch size={14} />
                Sub-flow
              </button>
            </div>
          </div>

          {/* Binding toggle — only for OPERATION_STEP */}
          {stepKind === 'OPERATION_STEP' && (
            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                Binding
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBinding('LINKED')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors cursor-pointer',
                    binding === 'LINKED'
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
                  )}
                >
                  <Link size={12} />
                  Linked
                </button>
                <button
                  onClick={() => setBinding('DETACHED')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors cursor-pointer',
                    binding === 'DETACHED'
                      ? 'border-[var(--color-warning)] bg-amber-500/10 text-[var(--color-warning)]'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
                  )}
                >
                  <Unlink size={12} />
                  Detached copy
                </button>
              </div>
              {binding === 'DETACHED' && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5">
                  Config will be copied from the operation. Changes to the original won't affect this step.
                </p>
              )}
            </div>
          )}

          {/* Operation / Flow selector */}
          {stepKind === 'OPERATION_STEP' ? (
            <Select
              label="Operation"
              value={selectedOperationId}
              onChange={(e) => setSelectedOperationId(e.target.value)}
              options={[
                { value: '', label: 'Select an operation...' },
                ...operations.map((op) => ({
                  value: op.id,
                  label: `${op.name} (${op.type === 'HTTP_REQUEST' ? 'HTTP' : op.type === 'SQL_QUERY' ? 'SQL' : 'Assert'})`,
                })),
              ]}
            />
          ) : (
            <Select
              label="Flow"
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
              options={[
                { value: '', label: 'Select a flow...' },
                ...availableFlows.map((f) => ({
                  value: f.id,
                  label: f.name,
                })),
              ]}
            />
          )}

          {/* On Fail */}
          <Select
            label="On Failure"
            value={onFail}
            onChange={(e) => setOnFail(e.target.value as OnFailStrategy)}
            options={[
              { value: 'STOP_FLOW', label: 'Stop flow' },
              { value: 'SKIP_AND_CONTINUE', label: 'Skip and continue' },
            ]}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--color-border)]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={
              (stepKind === 'OPERATION_STEP' && !selectedOperationId) ||
              (stepKind === 'FLOW_STEP' && !selectedFlowId)
            }
          >
            Add Step
          </Button>
        </div>
      </div>
    </>
  )
}
