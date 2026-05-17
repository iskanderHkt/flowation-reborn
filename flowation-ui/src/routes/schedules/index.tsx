import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useSchedules,
  useCreateSchedule,
  useDeleteSchedule,
  usePauseSchedule,
  useResumeSchedule,
} from '@/features/scheduling/hooks.ts'
import { useOperations } from '@/features/catalog/hooks.ts'
import { useFlows } from '@/features/flows/hooks.ts'
import { useBatches } from '@/features/batch/hooks.ts'
import { useEnvironments } from '@/features/environments/hooks.ts'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Select } from '@/components/ui/select.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { Zap, GitBranch, Layers, Plus, Trash2, Pause, Play, CalendarClock, ExternalLink } from 'lucide-react'
import type { TargetType, ScheduleCreateRequest } from '@/api/types.ts'

/* ─── Helpers ────────────────────────────────────────────── */

const TARGET_ICONS: Record<TargetType, typeof Zap> = {
  OPERATION: Zap,
  FLOW: GitBranch,
  BATCH: Layers,
}

const TARGET_LABELS: Record<TargetType, string> = {
  OPERATION: 'Operation',
  FLOW: 'Flow',
  BATCH: 'Batch',
}

const TARGET_OPTIONS: { value: TargetType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'OPERATION', label: 'Operations' },
  { value: 'FLOW', label: 'Flows' },
  { value: 'BATCH', label: 'Batches' },
]

function targetLink(targetType: TargetType, targetId: string): string {
  switch (targetType) {
    case 'OPERATION': return `/catalog/${targetId}`
    case 'FLOW': return `/flows/${targetId}`
    case 'BATCH': return `/batch/${targetId}`
  }
}

function formatNextFire(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/* ─── Create Dialog ──────────────────────────────────────── */

interface CreateDialogProps {
  open: boolean
  onClose: () => void
}

const INITIAL_FORM: ScheduleCreateRequest = {
  targetType: 'OPERATION',
  targetId: '',
  environmentId: null,
  cronExpression: '',
  description: null,
}

function CreateScheduleDialog({ open, onClose }: CreateDialogProps) {
  const [form, setForm] = useState<ScheduleCreateRequest>(INITIAL_FORM)
  const { toast } = useToast()
  const createMutation = useCreateSchedule()

  const { data: operations } = useOperations()
  const { data: flows } = useFlows()
  const { data: batches } = useBatches()
  const { data: environments } = useEnvironments()

  const targetOptions = (() => {
    if (form.targetType === 'OPERATION') return (operations ?? []).map((o) => ({ value: o.id, label: o.name }))
    if (form.targetType === 'FLOW') return (flows ?? []).map((f) => ({ value: f.id, label: f.name }))
    return (batches ?? []).map((b) => ({ value: b.id, label: b.name }))
  })()

  const envOptions = [
    { value: '', label: 'No environment' },
    ...(environments ?? []).map((e) => ({ value: e.id, label: e.name })),
  ]

  function handleClose() {
    setForm(INITIAL_FORM)
    onClose()
  }

  function handleTargetTypeChange(type: TargetType) {
    setForm((f) => ({ ...f, targetType: type, targetId: '' }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.targetId || !form.cronExpression) return
    createMutation.mutate(form, {
      onSuccess: () => {
        toast({ title: 'Schedule created', variant: 'success' })
        handleClose()
      },
      onError: (err) =>
        toast({ title: 'Failed to create schedule', description: String(err), variant: 'error' }),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Schedule</DialogTitle>
          <DialogDescription>Set up a recurring execution using a cron expression.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Target type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Target type</label>
            <Select
              value={form.targetType}
              options={[
                { value: 'OPERATION', label: 'Operation' },
                { value: 'FLOW', label: 'Flow' },
                { value: 'BATCH', label: 'Batch' },
              ]}
              onChange={(e) => handleTargetTypeChange(e.target.value as TargetType)}
            />
          </div>

          {/* Target */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">
              {TARGET_LABELS[form.targetType]}
            </label>
            <Select
              value={form.targetId}
              options={[{ value: '', label: `Select ${TARGET_LABELS[form.targetType].toLowerCase()}...` }, ...targetOptions]}
              onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}
            />
          </div>

          {/* Environment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Environment (optional)</label>
            <Select
              value={form.environmentId ?? ''}
              options={envOptions}
              onChange={(e) => setForm((f) => ({ ...f, environmentId: e.target.value || null }))}
            />
          </div>

          {/* Cron expression */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Cron expression</label>
            <Input
              value={form.cronExpression}
              onChange={(e) => setForm((f) => ({ ...f, cronExpression: e.target.value }))}
              placeholder="0 0/30 * * * ?"
              required
            />
            <span className="text-[11px] text-[var(--color-text-muted)]">
              Quartz format — 6 fields: <code className="font-mono">seconds minutes hours day month weekday</code>
              <br />
              Examples: <code className="font-mono">0 * * * * ?</code> (every min)&nbsp;&nbsp;
              <code className="font-mono">0 0 9 ? * MON-FRI</code> (weekdays 9am)
            </span>
          </div>

          {/* Description */}
          <Input
            label="Description (optional)"
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
            placeholder="Optional notes"
          />

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!form.targetId || !form.cronExpression || createMutation.isPending}
            >
              {createMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ─── Page ───────────────────────────────────────────────── */

export function SchedulesPage() {
  const { data: schedules, isLoading, error } = useSchedules()
  const deleteMutation = useDeleteSchedule()
  const pauseMutation = usePauseSchedule()
  const resumeMutation = useResumeSchedule()
  const { toast } = useToast()

  const [typeFilter, setTypeFilter] = useState<TargetType | 'ALL'>('ALL')
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = (schedules ?? []).filter(
    (s) => typeFilter === 'ALL' || s.targetType === typeFilter,
  )

  if (error) {
    return (
      <div className="text-sm text-[var(--color-error)] py-10 text-center">
        Failed to load schedules
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Schedules</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Recurring executions for operations, flows, and batches
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          value={typeFilter}
          options={TARGET_OPTIONS}
          onChange={(e) => setTypeFilter(e.target.value as TargetType | 'ALL')}
          className="w-36 !h-7 !text-xs !py-0"
        />
        <span className="text-xs text-[var(--color-text-muted)] ml-auto">
          {!isLoading && `${filtered.length} schedule${filtered.length !== 1 ? 's' : ''}`}
        </span>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} />
          New Schedule
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-5 w-5" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
          <CalendarClock size={32} className="opacity-30" />
          <span className="text-sm">No schedules yet. Create one to automate executions.</span>
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Type</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Target</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Cron</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Next fire</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Status</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const Icon = TARGET_ICONS[s.targetType]
                const isPaused = s.status === 'PAUSED'
                const isToggling =
                  (pauseMutation.isPending && pauseMutation.variables === s.id) ||
                  (resumeMutation.isPending && resumeMutation.variables === s.id)

                return (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                        <Icon size={12} />
                        {TARGET_LABELS[s.targetType]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        to={targetLink(s.targetType, s.targetId) as '/'}
                        className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        {s.targetName}
                      </Link>
                      {s.description && (
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                          {s.description}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-elevated)] px-1.5 py-0.5 rounded-[var(--radius-sm)]">
                        {s.cronExpression}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-[var(--color-text-muted)]">
                      {isPaused ? (
                        <span className="text-[var(--color-text-muted)] opacity-50">paused</span>
                      ) : (
                        formatNextFire(s.nextFireTime)
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={isPaused ? 'muted' : 'success'}>
                        {isPaused ? 'Paused' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {/* View target */}
                        <Link
                          to={targetLink(s.targetType, s.targetId) as '/'}
                          title="View executions"
                        >
                          <Button variant="ghost" size="sm">
                            <ExternalLink size={13} />
                          </Button>
                        </Link>

                        {/* Pause / Resume */}
                        <Button
                          variant="ghost"
                          size="sm"
                          title={isPaused ? 'Resume' : 'Pause'}
                          disabled={isToggling}
                          onClick={() => {
                            if (isPaused) {
                              resumeMutation.mutate(s.id, {
                                onSuccess: () => toast({ title: 'Schedule resumed', variant: 'success' }),
                                onError: (err) =>
                                  toast({ title: 'Failed to resume', description: String(err), variant: 'error' }),
                              })
                            } else {
                              pauseMutation.mutate(s.id, {
                                onSuccess: () => toast({ title: 'Schedule paused', variant: 'success' }),
                                onError: (err) =>
                                  toast({ title: 'Failed to pause', description: String(err), variant: 'error' }),
                              })
                            }
                          }}
                        >
                          {isToggling ? (
                            <Spinner className="h-3 w-3" />
                          ) : isPaused ? (
                            <Play size={13} className="text-[var(--color-accent)]" />
                          ) : (
                            <Pause size={13} />
                          )}
                        </Button>

                        {/* Delete */}
                        <ConfirmPopover
                          message={`Delete schedule for "${s.targetName}"?`}
                          onConfirm={() =>
                            deleteMutation.mutate(s.id, {
                              onSuccess: () =>
                                toast({ title: 'Schedule deleted', variant: 'success' }),
                              onError: (err) =>
                                toast({ title: 'Delete failed', description: String(err), variant: 'error' }),
                            })
                          }
                        >
                          <Button variant="ghost" size="sm" title="Delete">
                            <Trash2 size={13} className="text-red-400" />
                          </Button>
                        </ConfirmPopover>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CreateScheduleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
