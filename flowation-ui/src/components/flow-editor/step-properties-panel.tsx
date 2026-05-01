import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { OperationForm } from '@/components/operation-form.tsx'
import { ExtractionRulesEditor } from './extraction-rules-editor.tsx'
import { ResponseVariablePickerPanel } from './response-variable-picker.tsx'
import { useAddExtractionRule, useTestFlowStep, useUpdateFlowStep } from '@/hooks/use-flows.ts'
import { useToast } from '@/components/ui/toast.tsx'
import { Trash2, ExternalLink, ChevronRight, Zap, Database, ShieldCheck, GitBranch, Play, Save } from 'lucide-react'
import type { FlowStep, Operation, Flow, StepResultResponse, OperationType, OperationConfig } from '@/api/types.ts'
import { Link } from '@tanstack/react-router'

const TYPE_ICON: Record<OperationType, typeof Zap> = {
  HTTP_REQUEST: Zap,
  SQL_QUERY: Database,
  ASSERTION: ShieldCheck,
}

interface StepPropertiesPanelProps {
  step: FlowStep
  flowId: string
  operations: Operation[]
  flows: Flow[]
  executionResult?: StepResultResponse
  selectedEnvId?: string
  onDelete?: () => void
  onDrillDown: (flowId: string) => void
}

export function StepPropertiesPanel({
  step,
  flowId,
  operations,
  flows,
  executionResult,
  selectedEnvId,
  onDelete,
  onDrillDown,
}: StepPropertiesPanelProps) {
  const isFlowStep = step.stepKind === 'FLOW_STEP'
  // LINKED → look up by operationId; DETACHED → look up by sourceOperationId for display name
  const operation = operations.find((o) =>
    o.id === step.operationId || o.id === step.sourceOperationId
  ) ?? null
  const nestedFlow = step.nestedFlowId ? flows.find((f) => f.id === step.nestedFlowId) : null
  const operationType = operation?.type ?? step.ownConfig?.type

  const addRuleMutation = useAddExtractionRule(flowId, step.id)
  const testMutation = useTestFlowStep(flowId, step.id)
  const updateMutation = useUpdateFlowStep(flowId)
  const { toast } = useToast()

  const [testResult, setTestResult] = useState<StepResultResponse | null>(null)

  // Config editing state — the "effective" starting config:
  // LINKED: configOverride if set, else operation template
  // DETACHED: ownConfig
  const baseConfig = step.binding === 'LINKED'
    ? (step.configOverride ?? operation?.configTemplate ?? null)
    : (step.ownConfig ?? null)

  const [editedConfig, setEditedConfig] = useState<OperationConfig | null>(baseConfig)

  // Re-seed when step changes (different step selected)
  useEffect(() => {
    const next = step.binding === 'LINKED'
      ? (step.configOverride ?? operation?.configTemplate ?? null)
      : (step.ownConfig ?? null)
    setEditedConfig(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id])

  const configDirty = editedConfig !== null
    && JSON.stringify(editedConfig) !== JSON.stringify(baseConfig)

  const activeResult = testResult ?? executionResult

  const handleExtractVariable = async (sourcePath: string, suggestedName: string) => {
    try {
      await addRuleMutation.mutateAsync({ sourcePath, targetVariable: suggestedName })
      toast({ title: `Extracted ${suggestedName}`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to create rule', description: String(err), variant: 'error' })
    }
  }

  const handleTest = async () => {
    try {
      const result = await testMutation.mutateAsync(selectedEnvId || undefined)
      setTestResult(result)
    } catch (err) {
      toast({ title: 'Test failed', description: String(err), variant: 'error' })
    }
  }

  const handleSaveConfig = async () => {
    if (!editedConfig) return
    try {
      await updateMutation.mutateAsync({
        stepId: step.id,
        data: {
          stepKind: step.stepKind,
          binding: step.binding,
          operationId: step.operationId ?? undefined,
          sourceOperationId: step.sourceOperationId ?? undefined,
          nestedFlowId: step.nestedFlowId ?? undefined,
          onFail: step.onFail,
          // LINKED → save as configOverride; DETACHED → save as ownConfig
          configOverride: step.binding === 'LINKED' ? editedConfig : undefined,
          ownConfig: step.binding === 'DETACHED' ? editedConfig : undefined,
        },
      })
      toast({ title: 'Config saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to save config', description: String(err), variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isFlowStep ? (
            <GitBranch size={14} className="text-[var(--color-accent)]" />
          ) : operationType ? (
            (() => {
              const Icon = TYPE_ICON[operationType]
              return <Icon size={14} className="text-[var(--color-text-secondary)]" />
            })()
          ) : null}
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] truncate flex-1">
            {isFlowStep
              ? nestedFlow?.name ?? 'Unknown flow'
              : operation
                ? step.binding === 'DETACHED' ? `${operation.name} (copy)` : operation.name
                : 'Detached operation'}
          </h3>
          {/* Test button */}
          <button
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
          >
            {testMutation.isPending ? <Spinner className="h-2.5 w-2.5" /> : <Play size={9} />}
            Test
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <Badge variant={isFlowStep ? 'default' : 'muted'} className="!text-[10px]">
            {isFlowStep ? 'Sub-flow' : step.binding === 'LINKED' ? 'Linked' : 'Detached'}
          </Badge>
          <Badge variant={step.onFail === 'STOP_FLOW' ? 'error' : 'warning'} className="!text-[10px]">
            {step.onFail === 'STOP_FLOW' ? 'Stop on fail' : 'Skip on fail'}
          </Badge>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Step #{step.stepOrder}
          </span>
          {testResult && (
            <span className="ml-auto flex items-center gap-1">
              <Badge
                variant={testResult.status === 'COMPLETED' ? 'success' : testResult.status === 'FAILED' ? 'error' : 'muted'}
                className="!text-[10px]"
              >
                {testResult.status}
              </Badge>
              {testResult.durationMs != null && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {testResult.durationMs}ms
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Flow step — drill down */}
        {isFlowStep && step.nestedFlowId && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <button
              onClick={() => onDrillDown(step.nestedFlowId!)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
            >
              <span>Open sub-flow editor</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Config editor */}
        {!isFlowStep && editedConfig && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {step.binding === 'LINKED' ? 'Config Override' : 'Config'}
                </span>
                {configDirty && (
                  <span className="text-[10px] text-[var(--color-warning)]">unsaved</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {step.binding === 'LINKED' && step.configOverride && (
                  <button
                    onClick={() => setEditedConfig(operation?.configTemplate ?? null)}
                    className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors cursor-pointer"
                  >
                    Reset to linked
                  </button>
                )}
                {step.binding === 'LINKED' && step.operationId && (
                  <Link
                    to="/operations/$operationId"
                    params={{ operationId: step.operationId }}
                    className="flex items-center gap-1 text-[10px] text-[var(--color-accent)] hover:underline"
                  >
                    Edit operation <ExternalLink size={10} />
                  </Link>
                )}
              </div>
            </div>
            <OperationForm
              hideName
              name=""
              onNameChange={() => {}}
              config={editedConfig}
              onConfigChange={setEditedConfig}
            />
            {configDirty && (
              <Button
                size="sm"
                className="w-full mt-3"
                onClick={handleSaveConfig}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Spinner className="h-3 w-3" /> : <Save size={12} />}
                Save Config
              </Button>
            )}
          </div>
        )}

        {/* Extraction rules */}
        {!isFlowStep && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <ExtractionRulesEditor flowId={flowId} stepId={step.id} />
          </div>
        )}

        {/* Test result error */}
        {testResult?.errorMessage && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <div className="text-[11px] text-[var(--color-error)] bg-red-500/10 px-2 py-1.5 rounded-[var(--radius-sm)] font-mono break-all">
              {testResult.errorMessage}
            </div>
          </div>
        )}

        {/* Variable picker — from test result or last flow execution */}
        {activeResult?.responseSnapshot && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            {testResult && (
              <span className="text-[10px] text-[var(--color-accent)] font-medium block mb-2">
                Test run response
              </span>
            )}
            <ResponseVariablePickerPanel
              responseSnapshot={activeResult.responseSnapshot as Record<string, unknown> | null}
              onExtract={handleExtractVariable}
            />
          </div>
        )}

        {/* Last flow execution result */}
        {executionResult && (
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-secondary)] block mb-2">
              Last Flow Execution
            </span>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  executionResult.status === 'COMPLETED' ? 'success'
                    : executionResult.status === 'FAILED' ? 'error'
                    : 'muted'
                }
              >
                {executionResult.status}
              </Badge>
              {executionResult.durationMs != null && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {executionResult.durationMs}ms
                </span>
              )}
            </div>
            {executionResult.errorMessage && (
              <div className="text-[11px] text-[var(--color-error)] bg-red-500/10 px-2 py-1.5 rounded-[var(--radius-sm)] font-mono break-all">
                {executionResult.errorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer — delete */}
      {onDelete && (
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <ConfirmPopover
            message="Delete this step?"
            onConfirm={onDelete}
          >
            <Button variant="ghost" size="sm" className="w-full !text-red-400 hover:!bg-red-500/10">
              <Trash2 size={13} />
              Delete Step
            </Button>
          </ConfirmPopover>
        </div>
      )}
    </div>
  )
}
