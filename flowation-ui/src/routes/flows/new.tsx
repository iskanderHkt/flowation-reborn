import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useCreateFlow } from '@/features/flows/hooks.ts'
import { Button } from '@/components/ui/button.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { FormInput } from '@/shared/ui/form/index.ts'
import { FormTextarea } from '@/shared/ui/form/index.ts'
import { ArrowLeft } from 'lucide-react'

function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Name is required'
  if (value.length > 100) return 'Name too long'
  return undefined
}

export function FlowNewPage() {
  const navigate = useNavigate()
  const createMutation = useCreateFlow()
  const { toast } = useToast()

  const form = useForm({
    defaultValues: { name: '', description: '' },
    onSubmit: async ({ value }) => {
      try {
        const flow = await createMutation.mutateAsync({
          name: value.name.trim(),
          description: value.description.trim() || undefined,
        })
        toast({ title: `Created "${flow.name}"`, variant: 'success' })
        navigate({ to: '/flows/$flowId', params: { flowId: flow.id } })
      } catch (err) {
        toast({ title: 'Failed to create flow', description: String(err), variant: 'error' })
      }
    },
  })

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate({ to: '/flows' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">New Flow</h1>
        <div className="ml-auto">
          <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button
                size="sm"
                onClick={() => form.handleSubmit()}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>

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
              placeholder="e.g. Auth Flow, Checkout Suite"
              autoFocus
            />
          )}
        </form.Field>

        <form.Field name="description">
          {(field) => (
            <FormTextarea
              label="Description"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              placeholder="Optional description of what this flow tests..."
              rows={3}
              className="resize-none"
            />
          )}
        </form.Field>
      </form>
    </div>
  )
}
