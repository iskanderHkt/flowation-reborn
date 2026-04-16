import { useNavigate } from '@tanstack/react-router'
import { useCreateBatch } from '@/hooks/use-batches.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { BatchMode } from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

const MODES: { value: BatchMode; label: string; description: string }[] = [
  {
    value: 'MULTI',
    label: 'Multi',
    description: 'Run multiple different flows or operations in parallel, each once.',
  },
  {
    value: 'DATA_DRIVEN',
    label: 'Data-Driven',
    description: 'Run a single flow or operation against multiple datasets in parallel.',
  },
]

export function BatchNewPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createMutation = useCreateBatch()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<BatchMode>('MULTI')

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const created = await createMutation.mutateAsync({ name: name.trim(), mode })
      navigate({ to: '/batch/$batchId', params: { batchId: created.id } })
    } catch (err) {
      toast({ title: 'Failed to create batch', description: String(err), variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/batch' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">New Batch</span>
      </div>

      <div className="p-6 max-w-md">
        <div className="mb-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smoke Tests"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        <div className="mb-6">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Mode</p>
          <div className="flex flex-col gap-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'text-left px-3 py-3 rounded-[var(--radius-md)] border transition-colors cursor-pointer',
                  mode === m.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]',
                )}
              >
                <div className="text-xs font-medium text-[var(--color-text-primary)]">{m.label}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{m.description}</div>
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? <Spinner className="h-3 w-3" /> : null}
          Create Batch
        </Button>
      </div>
    </div>
  )
}
