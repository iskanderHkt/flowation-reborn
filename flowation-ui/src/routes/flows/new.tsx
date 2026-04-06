import { useNavigate } from '@tanstack/react-router'
import { useCreateFlow } from '@/hooks/use-flows.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export function FlowNewPage() {
  const navigate = useNavigate()
  const createMutation = useCreateFlow()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'error' })
      return
    }
    try {
      const flow = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      toast({ title: `Created "${flow.name}"`, variant: 'success' })
      navigate({ to: '/flows/$flowId', params: { flowId: flow.id } })
    } catch (err) {
      toast({ title: 'Failed to create flow', description: String(err), variant: 'error' })
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate({ to: '/flows' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          New Flow
        </h1>
        <div className="ml-auto">
          <Button
            size="sm"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Auth Flow, Checkout Suite"
          autoFocus
        />
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description of what this flow tests..."
            rows={3}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  )
}
