import { useNavigate } from '@tanstack/react-router'
import { useCreateEnvironment } from '@/hooks/use-environments.ts'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

export function EnvironmentNewPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createMutation = useCreateEnvironment()
  const [name, setName] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      const created = await createMutation.mutateAsync({ name: name.trim() })
      navigate({ to: '/environments/$environmentId', params: { environmentId: created.id } })
    } catch (err) {
      toast({ title: 'Failed to create', description: String(err), variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/environments' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">New Environment</span>
      </div>

      <div className="p-6 max-w-md">
        <div className="mb-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? <Spinner className="h-3 w-3" /> : null}
          Create Environment
        </Button>
      </div>
    </div>
  )
}
