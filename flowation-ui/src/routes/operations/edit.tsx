import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import {
  useOperation,
  useUpdateOperation,
  useStartOperationRun,
  useExecutionHistory,
  useGroups,
  operationKeys,
} from '@/features/catalog/hooks.ts'
import { useEnvironments } from '@/features/environments/hooks.ts'
import { useExecutionStream } from '@/shared/hooks/use-execution-stream.ts'
import { OperationForm } from '@/components/operation-form.tsx'
import { ExecutionPanel } from '@/components/execution-panel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { ResizeHandle } from '@/components/resize-handle.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft, Save, Play } from 'lucide-react'
import type { OperationConfig, OperationType, ExecutionResult } from '@/api/types.ts'

function OperationEditSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
        <Skeleton className="h-7 w-full max-w-sm" />
        <Skeleton className="h-7 w-full max-w-xs" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  )
}

const TYPE_LABELS: Record<OperationType, string> = {
  HTTP_REQUEST: 'HTTP',
  SQL_QUERY: 'SQL',
  ASSERTION: 'Assert',
}

function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Name is required'
  if (value.length > 100) return 'Name too long'
  return undefined
}

export function OperationEditPage() {
  const { operationId } = useParams({ from: '/catalog/$operationId' })
  const navigate = useNavigate()
  const { toast } = useToast()

  const qc = useQueryClient()
  const { data: operation, isLoading, error } = useOperation(operationId)
  const updateMutation = useUpdateOperation(operationId)
  const startRunMutation = useStartOperationRun(operationId)

  const [historyPageIndex, setHistoryPageIndex] = useState(0)
  const { data: executionHistoryPage, isLoading: historyLoading } =
    useExecutionHistory(operationId, historyPageIndex)

  const { data: environments = [] } = useEnvironments()
  const { data: groups = [] } = useGroups()

  const lsKey = `flowation:env:op:${operationId}`
  const [selectedEnvId, setSelectedEnvIdRaw] = useState<string>(
    () => localStorage.getItem(lsKey) ?? '',
  )
  const setSelectedEnvId = (id: string) => {
    localStorage.setItem(lsKey, id)
    setSelectedEnvIdRaw(id)
  }

  // Config is complex discriminated union — managed outside TanStack Form
  const [config, setConfig] = useState<OperationConfig | null>(null)
  const [savedConfig, setSavedConfig] = useState<OperationConfig | null>(null)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [savedGroupId, setSavedGroupId] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const stream = useExecutionStream(activeRunId)
  const [initialized, setInitialized] = useState(false)
  const [panelHeight, setPanelHeight] = useState(288)
  const onResize = useCallback((h: number) => setPanelHeight(h), [])

  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      if (!config) return
      try {
        const saved = await updateMutation.mutateAsync({
          name: value.name.trim(),
          config,
          groupId,
        })
        setConfig(saved.configTemplate)
        setSavedConfig(saved.configTemplate)
        setGroupId(saved.groupId ?? null)
        setSavedGroupId(saved.groupId ?? null)
        form.reset({ name: saved.name })
        toast({ title: 'Saved', variant: 'success' })
      } catch (err) {
        toast({ title: 'Save failed', description: String(err), variant: 'error' })
      }
    },
  })

  // Seed form once operation loads
  useEffect(() => {
    if (operation && !initialized) {
      form.reset({ name: operation.name })
      setConfig(operation.configTemplate)
      setSavedConfig(operation.configTemplate)
      setGroupId(operation.groupId ?? null)
      setSavedGroupId(operation.groupId ?? null)
      setInitialized(true)
    }
  }, [operation, initialized])

  const configDirty =
    config !== null && savedConfig !== null &&
    JSON.stringify(config) !== JSON.stringify(savedConfig)
  const groupDirty = groupId !== savedGroupId
  const dirty = form.state.isDirty || configDirty || groupDirty

  const handleSave = () => form.handleSubmit()

  const handleRun = async () => {
    try {
      if (dirty) await form.handleSubmit()
      const { runId } = await startRunMutation.mutateAsync(selectedEnvId || undefined)
      setActiveRunId(runId)
    } catch (err) {
      toast({ title: 'Run failed', description: String(err), variant: 'error' })
    }
  }

  // Build ExecutionResult from stream data when run completes
  useEffect(() => {
    if (stream.isStreaming || !stream.runStatus || !activeRunId) return
    const step = stream.steps[0] ?? null
    const result: ExecutionResult = {
      runId: activeRunId,
      operationId,
      runMode: 'INSTANT',
      status: stream.runStatus,
      startedAt: step?.startedAt ?? stream.completedAt ?? new Date().toISOString(),
      completedAt: stream.completedAt ?? new Date().toISOString(),
      durationMs: stream.totalDurationMs ?? 0,
      requestSnapshot: step?.requestSnapshot ?? {},
      responseSnapshot: step?.responseSnapshot ?? null,
      errorMessage: step?.errorMessage ?? null,
    }
    setLastResult(result)
    if (result.status === 'FAILED') {
      toast({ title: 'Execution failed', description: result.errorMessage ?? undefined, variant: 'error' })
    }
    qc.invalidateQueries({ queryKey: operationKeys.executionPage(operationId, historyPageIndex, 20) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.isStreaming])

  if (isLoading) {
    return <OperationEditSkeleton />
  }

  if (error || !operation) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-error)]">
        Operation not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/catalog' })}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <Badge variant="default">{TYPE_LABELS[operation.type]}</Badge>
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">
          {operation.name}
        </span>
        {dirty && (
          <span className="text-xs text-[var(--color-warning)]">unsaved</span>
        )}
        <div className="ml-auto flex items-center gap-2">
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
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
          >
            <Save size={13} />
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={startRunMutation.isPending || stream.isStreaming}
          >
            <Play size={13} />
            {stream.isStreaming ? 'Running...' : dirty ? 'Save & Run' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        {config && (
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => validateName(value),
            }}
          >
            {(field) => (
              <OperationForm
                name={field.state.value}
                config={config}
                onNameChange={(v) => field.handleChange(v)}
                onConfigChange={setConfig}
                groupId={groupId}
                onGroupIdChange={setGroupId}
                groups={groups}
                validationErrors={
                  field.state.meta.isTouched && field.state.meta.errors.length > 0
                    ? { name: String(field.state.meta.errors[0]) }
                    : null
                }
              />
            )}
          </form.Field>
        )}
      </div>

      {/* Resize handle + Execution panel */}
      <ResizeHandle size={panelHeight} onResize={onResize} />
      <div className="shrink-0 overflow-hidden" style={{ height: panelHeight }}>
        <ExecutionPanel
          result={lastResult}
          historyPage={executionHistoryPage}
          isExecuting={startRunMutation.isPending || stream.isStreaming}
          isLoadingHistory={historyLoading}
          historyPageIndex={historyPageIndex}
          onHistoryPageChange={setHistoryPageIndex}
        />
      </div>
    </div>
  )
}
