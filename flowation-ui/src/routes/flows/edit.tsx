import { useParams, useNavigate } from '@tanstack/react-router'
import { useFlow, useFlowSteps, useAddFlowStep, useDeleteFlowStep, useExecuteFlow, useFlowExecutionHistory, useMultipleFlowSteps } from '@/hooks/use-flows.ts'
import { useOperations } from '@/hooks/use-operations.ts'
import { useFlows } from '@/hooks/use-flows.ts'
import { useEnvironments } from '@/hooks/use-environments.ts'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { FlowCanvas } from '@/components/flow-editor/flow-canvas.tsx'
import { AddStepDialog } from '@/components/flow-editor/add-step-dialog.tsx'
import { StepPropertiesPanel } from '@/components/flow-editor/step-properties-panel.tsx'
import { FlowExecutionPanel } from '@/components/flow-editor/flow-execution-panel.tsx'
import { FlowVariablesPanel } from '@/components/flow-editor/flow-variables-panel.tsx'
import { ResizeHandle } from '@/components/resize-handle.tsx'
import { ArrowLeft, Play, ChevronRight, ChevronLeft } from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import type { FlowStepCreateRequest, ExecutionStatus, FlowExecutionResult } from '@/api/types.ts'

export function FlowEditPage() {
  const { flowId } = useParams({ strict: false }) as { flowId: string }
  const navigate = useNavigate()
  const { toast } = useToast()

  // Breadcrumb stack for drill-down
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])
  const activeFlowId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : flowId

  const { data: rootFlow, isLoading: loadingFlow } = useFlow(flowId)
  const { data: steps = [], isLoading: loadingSteps } = useFlowSteps(activeFlowId)
  const { data: operations = [] } = useOperations()
  const { data: allFlows = [] } = useFlows()

  const addStepMutation = useAddFlowStep(activeFlowId)
  const deleteStepMutation = useDeleteFlowStep(activeFlowId)
  const executeMutation = useExecuteFlow(flowId)
  const { data: executionHistory = [] } = useFlowExecutionHistory(flowId)

  const { data: environments = [] } = useEnvironments()
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [selectedStepFlowId, setSelectedStepFlowId] = useState<string | null>(null)
  const [expandedSubFlowStepIds, setExpandedSubFlowStepIds] = useState<Set<string>>(new Set())
  const [showAddDialog, setShowAddDialog] = useState(false)

  const expandedNestedFlowIds = useMemo(() => {
    return steps
      .filter((s) => s.stepKind === 'FLOW_STEP' && !!s.nestedFlowId && expandedSubFlowStepIds.has(s.id))
      .map((s) => s.nestedFlowId!)
  }, [steps, expandedSubFlowStepIds])

  const subFlowStepsMap = useMultipleFlowSteps(expandedNestedFlowIds)
  const [execPanelHeight, setExecPanelHeight] = useState(250)
  const [rightPanelWidth, setRightPanelWidth] = useState(340)
  const [varsPanelOpen, setVarsPanelOpen] = useState(true)

  // Latest execution result for status coloring
  const latestExecution = executionHistory[0] as FlowExecutionResult | undefined

  const executionStatuses = useMemo(() => {
    if (!latestExecution) return {}
    const map: Record<string, ExecutionStatus> = {}
    for (const stepResult of latestExecution.steps) {
      if (stepResult.stepRefId) {
        map[stepResult.stepRefId] = stepResult.status
      }
    }
    return map
  }, [latestExecution])

  const effectiveFlowId = selectedStepFlowId ?? activeFlowId

  const selectedStep = useMemo(() => {
    if (!selectedStepId) return null
    const main = steps.find((s) => s.id === selectedStepId)
    if (main) return main
    for (const subSteps of subFlowStepsMap.values()) {
      const found = subSteps.find((s) => s.id === selectedStepId)
      if (found) return found
    }
    return null
  }, [steps, selectedStepId, subFlowStepsMap])

  const handleAddStep = useCallback(async (request: FlowStepCreateRequest) => {
    try {
      await addStepMutation.mutateAsync(request)
      toast({ title: 'Step added', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to add step', description: String(err), variant: 'error' })
    }
  }, [addStepMutation, toast])

  const handleDeleteStep = useCallback(async (stepId: string) => {
    try {
      await deleteStepMutation.mutateAsync(stepId)
      if (selectedStepId === stepId) {
        setSelectedStepId(null)
        setSelectedStepFlowId(null)
      }
      toast({ title: 'Step deleted', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to delete step', description: String(err), variant: 'error' })
    }
  }, [deleteStepMutation, selectedStepId, toast])

  const handleSelectStep = useCallback((stepId: string | null, flowId?: string) => {
    setSelectedStepId(stepId)
    setSelectedStepFlowId(flowId ?? null)
  }, [])

  const handleToggleExpand = useCallback((stepId: string) => {
    setExpandedSubFlowStepIds((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }, [])

  const handleRun = useCallback(async () => {
    try {
      const result = await executeMutation.mutateAsync(selectedEnvId || undefined)
      toast({
        title: result.status === 'COMPLETED' ? 'Flow completed' : 'Flow failed',
        variant: result.status === 'COMPLETED' ? 'success' : 'error',
      })
    } catch (err) {
      toast({ title: 'Execution failed', description: String(err), variant: 'error' })
    }
  }, [executeMutation, toast])

  const handleDrillDown = useCallback((nestedFlowId: string) => {
    const flow = allFlows.find((f) => f.id === nestedFlowId)
    if (flow) {
      setBreadcrumbs((prev) => [...prev, { id: flow.id, name: flow.name }])
      setSelectedStepId(null)
      setSelectedStepFlowId(null)
    }
  }, [allFlows])

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      setBreadcrumbs([])
    } else {
      setBreadcrumbs((prev) => prev.slice(0, index + 1))
    }
    setSelectedStepId(null)
    setSelectedStepFlowId(null)
  }, [])

  if (loadingFlow) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  if (!rootFlow) {
    return (
      <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
        Flow not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/flows' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={() => handleBreadcrumbClick(-1)}
            className={`font-medium transition-colors cursor-pointer ${
              breadcrumbs.length === 0
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
            }`}
          >
            {rootFlow.name}
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              <ChevronRight size={12} className="text-[var(--color-text-muted)]" />
              <button
                onClick={() => handleBreadcrumbClick(i)}
                className={`font-medium transition-colors cursor-pointer ${
                  i === breadcrumbs.length - 1
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-accent)]'
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {latestExecution && (
            <Badge variant={latestExecution.status === 'COMPLETED' ? 'success' : latestExecution.status === 'FAILED' ? 'error' : 'muted'}>
              {latestExecution.status} ({latestExecution.totalDurationMs}ms)
            </Badge>
          )}
          {environments.length > 0 && (
            <select
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              className="h-7 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] cursor-pointer"
            >
              <option value="">No environment</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>{env.name}</option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={executeMutation.isPending || steps.length === 0}
          >
            {executeMutation.isPending ? (
              <Spinner className="h-3 w-3" />
            ) : (
              <Play size={13} />
            )}
            Run Flow
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Variables panel (left) */}
          <div className="relative flex shrink-0">
            {varsPanelOpen && (
              <div className="w-[200px] border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-hidden flex flex-col">
                <FlowVariablesPanel
                  flowId={activeFlowId}
                  steps={steps}
                  operations={operations}
                  flows={allFlows}
                  onStepClick={(id) => handleSelectStep(id ?? null)}
                />
              </div>
            )}
            {/* Toggle button */}
            <button
              onClick={() => setVarsPanelOpen((v) => !v)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-3 h-10 flex items-center justify-center bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-r-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
            >
              {varsPanelOpen ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
            </button>
          </div>

          {/* Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {loadingSteps ? (
              <div className="flex items-center justify-center h-full">
                <Spinner className="h-5 w-5" />
              </div>
            ) : (
              <FlowCanvas
                steps={steps}
                operations={operations}
                flows={allFlows}
                selectedStepId={selectedStepId}
                onSelectStep={handleSelectStep}
                onAddStep={() => setShowAddDialog(true)}
                onDrillDown={handleDrillDown}
                onToggleExpand={handleToggleExpand}
                expandedSubFlowStepIds={expandedSubFlowStepIds}
                subFlowStepsMap={subFlowStepsMap}
                executionStatuses={executionStatuses}
              />
            )}
          </div>

          {/* Properties panel with horizontal resize */}
          {selectedStep && (
            <>
              <ResizeHandle
                direction="horizontal"
                size={rightPanelWidth}
                onResize={setRightPanelWidth}
                min={260}
                max={600}
              />
              <div
                className="border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] overflow-y-auto shrink-0"
                style={{ width: rightPanelWidth }}
              >
                <StepPropertiesPanel
                  step={selectedStep}
                  flowId={effectiveFlowId}
                  operations={operations}
                  flows={allFlows}
                  executionResult={latestExecution?.steps.find((s) => s.stepRefId === selectedStep.id)}
                  onDelete={selectedStepFlowId ? undefined : () => handleDeleteStep(selectedStep.id)}
                  onDrillDown={handleDrillDown}
                />
              </div>
            </>
          )}
        </div>

        {/* Execution panel */}
        <div
          className="border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0 overflow-hidden"
          style={{ height: execPanelHeight }}
        >
          <ResizeHandle
            direction="vertical"
            size={execPanelHeight}
            onResize={setExecPanelHeight}
            min={120}
            max={600}
          />
          <FlowExecutionPanel
            latestResult={latestExecution}
            history={executionHistory}
            onStepClick={(stepRefId) => setSelectedStepId(stepRefId)}
          />
        </div>
      </div>

      {/* Add step dialog */}
      <AddStepDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddStep}
        operations={operations}
        flows={allFlows}
        currentFlowId={activeFlowId}
      />
    </div>
  )
}
