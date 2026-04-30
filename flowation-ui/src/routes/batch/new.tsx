import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useCreateBatch } from '@/features/batch/hooks.ts'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { FormInput } from '@/shared/ui/form/index.ts'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn.ts'
import type { BatchMode } from '@/api/types.ts'

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

function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Name is required'
  if (value.length > 100) return 'Name too long'
  return undefined
}

export function BatchNewPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createMutation = useCreateBatch()

  const form = useForm({
    defaultValues: { name: '', mode: 'MULTI' as BatchMode },
    onSubmit: async ({ value }) => {
      try {
        const created = await createMutation.mutateAsync({
          name: value.name.trim(),
          mode: value.mode,
        })
        navigate({ to: '/batch/$batchId', params: { batchId: created.id } })
      } catch (err) {
        toast({ title: 'Failed to create batch', description: String(err), variant: 'error' })
      }
    },
  })

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
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => validateName(value),
              onSubmit: ({ value }) => validateName(value),
            }}
          >
            {(field) => (
              <FormInput
                label="Name"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={field.state.meta.errors[0]?.toString()}
                touched={field.state.meta.isTouched}
                placeholder="e.g. Smoke Tests"
                autoFocus
              />
            )}
          </form.Field>

          <form.Field name="mode">
            {(field) => (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Mode</p>
                <div className="flex flex-col gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => field.handleChange(m.value)}
                      className={cn(
                        'text-left px-3 py-3 rounded-[var(--radius-md)] border transition-colors cursor-pointer',
                        field.state.value === m.value
                          ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)] bg-[var(--color-bg-secondary)]',
                      )}
                    >
                      <div className="text-xs font-medium text-[var(--color-text-primary)]">{m.label}</div>
                      <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{m.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner className="h-3 w-3" /> : null}
                Create Batch
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  )
}
