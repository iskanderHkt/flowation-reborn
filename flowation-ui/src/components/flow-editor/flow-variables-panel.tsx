import { Variable, Zap, Database, ShieldCheck, GitBranch, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useExtractionRules } from '@/hooks/use-flows.ts'
import { cn } from '@/lib/cn.ts'
import type { FlowStep, Operation, Flow, OperationType } from '@/api/types.ts'

const TYPE_ICON: Record<OperationType, typeof Zap> = {
  HTTP_REQUEST: Zap,
  SQL_QUERY: Database,
  ASSERTION: ShieldCheck,
}

interface FlowVariablesPanelProps {
  flowId: string
  steps: FlowStep[]
  operations: Operation[]
  flows: Flow[]
  onStepClick: (stepId: string) => void
}

export function FlowVariablesPanel({ flowId, steps, operations, flows, onStepClick }: FlowVariablesPanelProps) {
  const operationSteps = steps.filter((s) => s.stepKind === 'OPERATION_STEP')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-[var(--color-border)] shrink-0">
        <Variable size={12} className="text-[var(--color-accent)]" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Variables</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {operationSteps.length === 0 ? (
          <div className="px-3 py-6 text-[11px] text-[var(--color-text-muted)] text-center">
            No steps yet
          </div>
        ) : (
          operationSteps.map((step) => (
            <StepVariableGroup
              key={step.id}
              step={step}
              flowId={flowId}
              operations={operations}
              onStepClick={onStepClick}
            />
          ))
        )}
        {/* Flow steps just noted, no variables */}
        {steps.filter((s) => s.stepKind === 'FLOW_STEP').map((step) => {
          const nestedFlow = step.nestedFlowId ? flows.find((f) => f.id === step.nestedFlowId) : null
          return (
            <div key={step.id} className="px-3 py-2 border-b border-[var(--color-border-subtle)]">
              <button
                onClick={() => onStepClick(step.id)}
                className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer w-full text-left"
              >
                <GitBranch size={10} className="shrink-0" />
                <span className="truncate">{nestedFlow?.name ?? 'Sub-flow'}</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StepVariableGroup({
  step,
  flowId,
  operations,
  onStepClick,
}: {
  step: FlowStep
  flowId: string
  operations: Operation[]
  onStepClick: (stepId: string) => void
}) {
  const { data: rules = [] } = useExtractionRules(flowId, step.id)
  const [collapsed, setCollapsed] = useState(false)

  const operation = operations.find((o) =>
    o.id === step.operationId || o.id === step.sourceOperationId
  ) ?? null
  const operationType = operation?.type ?? step.ownConfig?.type
  const Icon = operationType ? TYPE_ICON[operationType] : Zap
  const stepName = operation?.name ?? 'Detached'

  return (
    <div className="border-b border-[var(--color-border-subtle)]">
      {/* Step header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 group">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer shrink-0"
        >
          {collapsed ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        </button>
        <button
          onClick={() => onStepClick(step.id)}
          className="flex items-center gap-1.5 flex-1 min-w-0 hover:text-[var(--color-accent)] transition-colors cursor-pointer text-left"
        >
          <Icon size={10} className="text-[var(--color-text-muted)] shrink-0" />
          <span className="text-[11px] text-[var(--color-text-secondary)] truncate">{stepName}</span>
          <span className="text-[10px] text-[var(--color-text-muted)] shrink-0 ml-auto">
            #{step.stepOrder}
          </span>
        </button>
      </div>

      {/* Variables */}
      {!collapsed && (
        <div className="pb-1.5">
          {rules.length === 0 ? (
            <div className="px-6 py-0.5 text-[10px] text-[var(--color-text-muted)] italic">
              no variables
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  'flex items-center gap-1.5 px-6 py-0.5',
                )}
                title={`${rule.sourcePath} → {{${rule.targetVariable}}}`}
              >
                <span className="w-1 h-1 rounded-full bg-[var(--color-accent)] shrink-0" />
                <span className="text-[11px] font-mono text-[var(--color-text-primary)] truncate">
                  {rule.targetVariable}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
