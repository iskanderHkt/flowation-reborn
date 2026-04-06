import { useParams, useNavigate } from '@tanstack/react-router'
import { useEnvironment, useUpdateEnvironment, useUpsertVariables } from '@/hooks/use-environments.ts'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn.ts'

interface VarRow {
  key: string
  value: string
}

export function EnvironmentEditPage() {
  const { environmentId } = useParams({ strict: false }) as { environmentId: string }
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: env, isLoading } = useEnvironment(environmentId)
  const updateMutation = useUpdateEnvironment(environmentId)
  const upsertMutation = useUpsertVariables(environmentId)

  const [name, setName] = useState('')
  const [rows, setRows] = useState<VarRow[]>([])

  // Seed state once env loads
  useEffect(() => {
    if (!env) return
    setName(env.name)
    setRows(env.variables.map((v) => ({ key: v.key, value: v.value })))
  }, [env?.id])

  const nameDirty = env ? name !== env.name : false
  const varsDirty = env
    ? JSON.stringify(rows) !== JSON.stringify(env.variables.map((v) => ({ key: v.key, value: v.value })))
    : false
  const dirty = nameDirty || varsDirty

  const handleSave = async () => {
    try {
      if (nameDirty) {
        await updateMutation.mutateAsync({ name })
      }
      if (varsDirty) {
        const filtered = rows.filter((r) => r.key.trim())
        await upsertMutation.mutateAsync({ variables: filtered })
      }
      toast({ title: 'Saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to save', description: String(err), variant: 'error' })
    }
  }

  const addRow = () => setRows((prev) => [...prev, { key: '', value: '' }])

  const updateRow = (index: number, field: 'key' | 'value', val: string) => {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: val } : r))
  }

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const isPending = updateMutation.isPending || upsertMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  if (!env) {
    return (
      <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
        Environment not found
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/environments' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate flex-1">{env.name}</span>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!dirty || isPending}
        >
          {isPending ? <Spinner className="h-3 w-3" /> : <Save size={13} />}
          Save
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {/* Name */}
        <div className="mb-6">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production"
          />
        </div>

        {/* Variables */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              Variables
            </label>
            <button
              onClick={addRow}
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              <Plus size={12} />
              Add variable
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="text-xs text-[var(--color-text-muted)] py-6 text-center border border-dashed border-[var(--color-border)] rounded-[var(--radius-md)]">
              No variables yet. Click "Add variable" to start.
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)] w-2/5">Key</th>
                    <th className="px-3 py-2 text-left font-medium text-[var(--color-text-muted)]">Value</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-[var(--color-border-subtle)] last:border-0',
                        !row.key.trim() && row.value && 'bg-yellow-500/5',
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={row.key}
                          onChange={(e) => updateRow(i, 'key', e.target.value)}
                          placeholder="VARIABLE_NAME"
                          className="w-full bg-transparent font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => updateRow(i, 'value', e.target.value)}
                          placeholder="value"
                          className="w-full bg-transparent font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <button
                          onClick={() => removeRow(i)}
                          className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
            Use <code className="font-mono bg-[var(--color-bg-elevated)] px-1 rounded">{'{{KEY}}'}</code> in operation configs to reference these variables.
          </p>
        </div>
      </div>
    </div>
  )
}
