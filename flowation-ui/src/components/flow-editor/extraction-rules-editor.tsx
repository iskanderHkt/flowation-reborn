import { useState } from 'react'
import { useExtractionRules, useAddExtractionRule, useDeleteExtractionRule } from '@/hooks/use-flows.ts'
import { Button } from '@/components/ui/button.tsx'
import { Plus, Trash2, ArrowRight } from 'lucide-react'
import { useToast } from '@/components/ui/toast.tsx'

interface ExtractionRulesEditorProps {
  flowId: string
  stepId: string
}

export function ExtractionRulesEditor({ flowId, stepId }: ExtractionRulesEditorProps) {
  const { data: rules = [] } = useExtractionRules(flowId, stepId)
  const addMutation = useAddExtractionRule(flowId, stepId)
  const deleteMutation = useDeleteExtractionRule(flowId, stepId)
  const { toast } = useToast()

  const [adding, setAdding] = useState(false)
  const [sourcePath, setSourcePath] = useState('')
  const [targetVariable, setTargetVariable] = useState('')

  const handleAdd = async () => {
    if (!sourcePath.trim() || !targetVariable.trim()) return
    try {
      await addMutation.mutateAsync({
        sourcePath: sourcePath.trim(),
        targetVariable: targetVariable.trim(),
      })
      setSourcePath('')
      setTargetVariable('')
      setAdding(false)
      toast({ title: 'Rule added', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to add rule', description: String(err), variant: 'error' })
    }
  }

  const handleDelete = async (ruleId: string) => {
    try {
      await deleteMutation.mutateAsync(ruleId)
      toast({ title: 'Rule deleted', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to delete rule', description: String(err), variant: 'error' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Extraction Rules
        </span>
        <button
          onClick={() => setAdding(!adding)}
          className="p-0.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Existing rules */}
      {rules.length === 0 && !adding && (
        <span className="text-[11px] text-[var(--color-text-muted)]">
          No extraction rules. Add one to pass values to next steps.
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] group"
          >
            <span className="text-[11px] font-mono text-[var(--color-accent)] truncate flex-1">
              {rule.sourcePath}
            </span>
            <ArrowRight size={10} className="text-[var(--color-text-muted)] shrink-0" />
            <span className="text-[11px] font-mono text-[var(--color-success)] truncate flex-1">
              {rule.targetVariable}
            </span>
            <button
              onClick={() => handleDelete(rule.id)}
              className="p-0.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Add new rule form */}
      {adding && (
        <div className="mt-2 flex flex-col gap-1.5 p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
          <input
            type="text"
            value={sourcePath}
            onChange={(e) => setSourcePath(e.target.value)}
            placeholder="$.body.token"
            className="h-6 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-[11px] font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            autoFocus
          />
          <input
            type="text"
            value={targetVariable}
            onChange={(e) => setTargetVariable(e.target.value)}
            placeholder="auth_token"
            className="h-6 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2 text-[11px] font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <div className="flex justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setAdding(false); setSourcePath(''); setTargetVariable('') }}
              className="!h-6 !text-[11px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={!sourcePath.trim() || !targetVariable.trim() || addMutation.isPending}
              className="!h-6 !text-[11px]"
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
