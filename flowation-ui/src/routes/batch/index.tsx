import { Link } from '@tanstack/react-router'
import { useBatches, useDeleteBatch } from '@/hooks/use-batches.ts'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { BatchMode } from '@/api/types.ts'

const MODE_BADGE: Record<BatchMode, { label: string; variant: 'default' | 'info' }> = {
  MULTI: { label: 'Multi', variant: 'default' },
  DATA_DRIVEN: { label: 'Data-Driven', variant: 'info' },
}

export function BatchPage() {
  const { data: batches, isLoading, error } = useBatches()
  const deleteMutation = useDeleteBatch()
  const { toast } = useToast()

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Batch</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Run multiple flows or operations in parallel
        </p>
      </div>

      <div className="flex items-center mb-4">
        <Link to="/batch/new" className="ml-auto">
          <Button size="sm">
            <Plus size={14} />
            New Batch
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-5 w-5" />
        </div>
      ) : error ? (
        <div className="text-sm text-[var(--color-error)] py-10 text-center">
          Failed to load batches
        </div>
      ) : !batches?.length ? (
        <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
          No batches yet. Create your first one.
        </div>
      ) : (
        <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Name</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Mode</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Items</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Created</th>
                <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => {
                const modeBadge = MODE_BADGE[batch.mode]
                return (
                  <tr
                    key={batch.id}
                    className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to="/batch/$batchId"
                        params={{ batchId: batch.id }}
                        className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors font-medium"
                      >
                        {batch.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={modeBadge.variant}>{modeBadge.label}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs">
                      {batch.mode === 'DATA_DRIVEN'
                        ? `${batch.dataRows.length} row${batch.dataRows.length !== 1 ? 's' : ''}`
                        : `${batch.items.length} item${batch.items.length !== 1 ? 's' : ''}`}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs font-mono">
                      {new Date(batch.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/batch/$batchId" params={{ batchId: batch.id }}>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Pencil size={13} />
                          </Button>
                        </Link>
                        <ConfirmPopover
                          message={`Delete "${batch.name}"?`}
                          onConfirm={() =>
                            deleteMutation.mutate(batch.id, {
                              onSuccess: () => toast({ title: `Deleted "${batch.name}"`, variant: 'success' }),
                              onError: (err) => toast({ title: 'Delete failed', description: String(err), variant: 'error' }),
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
    </div>
  )
}
