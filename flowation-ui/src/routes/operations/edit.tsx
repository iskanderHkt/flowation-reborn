import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import {
  useOperation,
  useUpdateOperation,
  useExecuteOperation,
  useExecutionHistory,
} from '@/hooks/use-operations.ts'
import { useEnvironments } from '@/hooks/use-environments.ts'
import { OperationForm } from '@/components/operation-form.tsx'
import { ExecutionPanel } from '@/components/execution-panel.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { ResizeHandle } from '@/components/resize-handle.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { validateOperationForm } from '@/api/validation.ts'
import { ArrowLeft, Save, Play } from 'lucide-react'
import type { Operation, OperationConfig, ExecutionResult, OperationType } from '@/api/types.ts'

const TYPE_LABELS: Record<OperationType, string> = {
  HTTP_REQUEST: 'HTTP',
  SQL_QUERY: 'SQL',
  ASSERTION: 'Assert',
}

export function OperationEditPage() {
  const { operationId } = useParams({ from: '/operations/$operationId' })
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: operation, isLoading, error } = useOperation(operationId)
  const updateMutation = useUpdateOperation(operationId)
  const executeMutation = useExecuteOperation(operationId)
  const { data: executionHistory = [], isLoading: historyLoading } =
    useExecutionHistory(operationId)

  const { data: environments = [] } = useEnvironments()
  const [selectedEnvId, setSelectedEnvId] = useState<string>('')

  const [name, setName] = useState('')
  const [config, setConfig] = useState<OperationConfig | null>(null)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [panelHeight, setPanelHeight] = useState(288)
  const [validationErrors, setValidationErrors] = useState<Record<string, string> | null>(null)
  const onResize = useCallback((h: number) => setPanelHeight(h), [])

  // Snapshot of the last saved state — used to compute dirty
  const [savedSnapshot, setSavedSnapshot] = useState<{ name: string; config: OperationConfig } | null>(null)

  const dirty = savedSnapshot !== null && config !== null
    && (name.trim() !== savedSnapshot.name || JSON.stringify(config) !== JSON.stringify(savedSnapshot.config))

  // Seed form only on initial load
  useEffect(() => {
    if (operation && !initialized) {
      setName(operation.name)
      setConfig(operation.configTemplate)
      setSavedSnapshot({ name: operation.name, config: operation.configTemplate })
      setInitialized(true)
    }
  }, [operation, initialized])

  // Clear validation errors on edit
  useEffect(() => {
    if (validationErrors) setValidationErrors(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, config])

  const syncFromSaved = (saved: Operation) => {
    setName(saved.name)
    setConfig(saved.configTemplate)
    setSavedSnapshot({ name: saved.name, config: saved.configTemplate })
  }

  const validate = (): boolean => {
    if (!config) return false
    const errors = validateOperationForm(name, config)
    if (errors) {
      setValidationErrors(errors)
      const firstError = Object.values(errors)[0]
      toast({ title: 'Validation error', description: firstError, variant: 'error' })
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!config || !validate()) return
    try {
      const saved = await updateMutation.mutateAsync({ name: name.trim(), config })
      syncFromSaved(saved)
      toast({ title: 'Saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), variant: 'error' })
    }
  }

  const handleRun = async () => {
    try {
      if (dirty && config) {
        if (!validate()) return
        const saved = await updateMutation.mutateAsync({ name: name.trim(), config })
        syncFromSaved(saved)
      }
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
          onClick={() => navigate({ to: '/operations' })}
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
        <div>
          {config && (
            <OperationForm
              name={name}
              config={config}
              onNameChange={setName}
              onConfigChange={setConfig}
              validationErrors={validationErrors}
            />
          )}
        </div>
      </div>

      {/* Resize handle + Execution panel */}
      <ResizeHandle size={panelHeight} onResize={onResize} />
      <div className="shrink-0 overflow-hidden" style={{ height: panelHeight }}>
        <ExecutionPanel
          result={lastResult}
          history={executionHistory}
          isExecuting={executeMutation.isPending}
          isLoadingHistory={historyLoading}
        />
      </div>
    </div>
  )
}
