import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useCreateOperation, useExecuteOperation } from '@/hooks/use-operations.ts'
import { OperationForm, defaultConfig } from '@/components/operation-form.tsx'
import { ExecutionPanel } from '@/components/execution-panel.tsx'
import { ResizeHandle } from '@/components/resize-handle.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { validateOperationForm } from '@/api/validation.ts'
import { ArrowLeft, Save, Play } from 'lucide-react'
import type { OperationConfig, ExecutionResult } from '@/api/types.ts'

export function OperationNewPage() {
  const navigate = useNavigate()
  const createMutation = useCreateOperation()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [config, setConfig] = useState<OperationConfig>(defaultConfig('HTTP_REQUEST'))
  const [validationErrors, setValidationErrors] = useState<Record<string, string> | null>(null)

  // After save, we keep the saved operation id to enable Run
  const [savedId, setSavedId] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null)
  const [history, setHistory] = useState<ExecutionResult[]>([])
  const [panelHeight, setPanelHeight] = useState(288)
  const onResize = useCallback((h: number) => setPanelHeight(h), [])

  const executeMutation = useExecuteOperation(savedId ?? '')

  const canRun = savedId !== null

  // Clear validation errors on edit
  useEffect(() => {
    if (validationErrors) setValidationErrors(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, config])

  const validate = (): boolean => {
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
    if (!validate()) return
    try {
      const op = await createMutation.mutateAsync({ name: name.trim(), config })
      setSavedId(op.id)
      toast({ title: 'Created', variant: 'success' })
      navigate({ to: '/operations/$operationId', params: { operationId: op.id } })
    } catch (err) {
      toast({ title: 'Save failed', description: String(err), variant: 'error' })
    }
  }

  const handleRun = async () => {
    if (!savedId) return
    try {
      const result = await executeMutation.mutateAsync()
      setLastResult(result)
      setHistory((prev) => [result, ...prev])
      if (result.status === 'FAILED') {
        toast({ title: 'Execution failed', description: result.errorMessage ?? undefined, variant: 'error' })
      }
    } catch (err) {
      toast({ title: 'Run failed', description: String(err), variant: 'error' })
    }
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
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          New Operation
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            <Save size={13} />
            {createMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!canRun || executeMutation.isPending}
          >
            <Play size={13} />
            Run
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <div>
          <OperationForm
            name={name}
            config={config}
            onNameChange={setName}
            onConfigChange={setConfig}
            isNew
            validationErrors={validationErrors}
          />
        </div>
      </div>

      {/* Resize handle + Execution panel */}
      <ResizeHandle panelHeight={panelHeight} onResize={onResize} />
      <div className="shrink-0 overflow-hidden" style={{ height: panelHeight }}>
        <ExecutionPanel
          result={lastResult}
          history={history}
          isExecuting={executeMutation.isPending}
          isLoadingHistory={false}
        />
      </div>
    </div>
  )
}
