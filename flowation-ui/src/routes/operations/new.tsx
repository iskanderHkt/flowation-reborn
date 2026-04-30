import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useCreateOperation, useGroups } from '@/features/catalog/hooks.ts'
import { OperationForm, defaultConfig } from '@/components/operation-form.tsx'
import { Button } from '@/components/ui/button.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft, Save } from 'lucide-react'
import type { OperationConfig } from '@/api/types.ts'

function validateName(value: string): string | undefined {
  if (!value.trim()) return 'Name is required'
  if (value.length > 100) return 'Name too long'
  return undefined
}

export function OperationNewPage() {
  const navigate = useNavigate()
  const createMutation = useCreateOperation()
  const { toast } = useToast()
  const { data: groups = [] } = useGroups()

  // Config is complex discriminated union — managed outside TanStack Form
  const [config, setConfig] = useState<OperationConfig>(defaultConfig('HTTP_REQUEST'))
  const [groupId, setGroupId] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { name: '' },
    onSubmit: async ({ value }) => {
      try {
        const op = await createMutation.mutateAsync({
          name: value.name.trim(),
          config,
          groupId,
        })
        toast({ title: 'Created', variant: 'success' })
        navigate({ to: '/catalog/$operationId', params: { operationId: op.id } })
      } catch (err) {
        toast({ title: 'Save failed', description: String(err), variant: 'error' })
      }
    },
  })

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/catalog' })}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-sm font-medium text-[var(--color-text-primary)]">New Operation</span>
        <div className="ml-auto">
          <form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
            {({ canSubmit, isSubmitting }) => (
              <Button
                size="sm"
                onClick={() => form.handleSubmit()}
                disabled={!canSubmit || isSubmitting}
              >
                <Save size={13} />
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => validateName(value),
            onSubmit: ({ value }) => validateName(value),
          }}
        >
          {(field) => (
            <OperationForm
              name={field.state.value}
              config={config}
              onNameChange={(v) => field.handleChange(v)}
              onConfigChange={setConfig}
              groupId={groupId}
              onGroupIdChange={setGroupId}
              groups={groups}
              isNew
              validationErrors={
                field.state.meta.isTouched && field.state.meta.errors.length > 0
                  ? { name: String(field.state.meta.errors[0]) }
                  : null
              }
            />
          )}
        </form.Field>
      </div>
    </div>
  )
}
