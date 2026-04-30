import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useCreateEnvironment } from '@/features/environments/hooks.ts'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { FormInput } from '@/shared/ui/form/index.ts'
import { ArrowLeft } from 'lucide-react'

function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Name is required'
  if (value.length > 100) return 'Name too long'
  return undefined
}

export function EnvironmentNewPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createMutation = useCreateEnvironment()

  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      try {
        const created = await createMutation.mutateAsync({ name: value.name.trim() })
        navigate({ to: '/environments/$environmentId', params: { environmentId: created.id } })
      } catch (err) {
        toast({ title: 'Failed to create', description: String(err), variant: 'error' })
      }
    },
  })

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
                placeholder="e.g. Production, Staging"
                autoFocus
              />
            )}
          </form.Field>

          <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button type="submit" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? <Spinner className="h-3 w-3" /> : null}
                Create Environment
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  )
}
