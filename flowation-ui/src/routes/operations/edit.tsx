import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import {
  useOperation,
  useUpdateOperation,
  useExecuteOperation,
  useExecutionHistory,
  useGroups,
} from '@/features/catalog/hooks.ts'
import { useEnvironments } from '@/features/environments/hooks.ts'
import { OperationForm } from '@/components/operation-form.tsx'
import { ExecutionPanel } from '@/components/execution-panel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { ResizeHandle } from '@/components/resize-handle.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft, Save, Play } from 'lucide-react'
import type { OperationConfig, OperationType, ExecutionResult } from '@/api/types.ts'

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

  const { data: operation, isLoading, error } = useOperation(operationId)
  const updateMutation = useUpdateOperation(operationId)
  const executeMutation = useExecuteOperation(operationId)

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
      const result = await executeMutation.mutateAsync(selectedEnvId || undefined)
      setLastResult(result)
      if (result.status === 'FAILED') {
        toast({ title: 'Execution failed', description: result.errorMessage ?? undefined, variant: 'error' })
      }
    } catch (err) {
      toast({ title: 'Run failed', description: String(err), variant: 'error' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-5 w-5" />
      </div>
    )
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
            disabled={executeMutation.isPending}
          >
            <Play size={13} />
            {dirty ? 'Save & Run' : 'Run'}
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
          isExecuting={executeMutation.isPending}
          isLoadingHistory={historyLoading}
          historyPageIndex={historyPageIndex}
          onHistoryPageChange={setHistoryPageIndex}
        />
      </div>
    </div>
  )
}
