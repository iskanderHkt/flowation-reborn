import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { useBatches, useDeleteBatch } from '@/features/batch/hooks.ts'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Select } from '@/components/ui/select.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import { DataTable } from '@/shared/ui/data-table.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { usePagination } from '@/shared/hooks/use-pagination.ts'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn.ts'
import type { Batch, BatchMode } from '@/api/types.ts'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

const MODE_BADGE: Record<BatchMode, { label: string; variant: 'default' | 'info' }> = {
  MULTI: { label: 'Multi', variant: 'default' },
  DATA_DRIVEN: { label: 'Data-Driven', variant: 'info' },
}

export function BatchPage() {
  const { data: batches, isLoading, error } = useBatches()
  const deleteMutation = useDeleteBatch()
  const { toast } = useToast()

  const items = useMemo(() => batches ?? [], [batches])
  const { page, pageSize, totalPages, setPage, setPageSize, startIndex, endIndex, paginate } =
    usePagination({ totalItems: items.length })
  const paginated = paginate(items)

  const columns = useMemo<ColumnDef<Batch, unknown>[]>(
    () => [
      {
        header: 'Name',
        accessorKey: 'name',
        cell: ({ row }) => (
          <Link
            to="/batch/$batchId"
            params={{ batchId: row.original.id }}
            className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors"
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        header: 'Mode',
        accessorKey: 'mode',
        size: 130,
        cell: ({ row }) => {
          const badge = MODE_BADGE[row.original.mode]
          return <Badge variant={badge.variant}>{badge.label}</Badge>
        },
      },
      {
        header: 'Items / Rows',
        id: 'count',
        size: 120,
        cell: ({ row }) => {
          const batch = row.original
          const count =
            batch.mode === 'DATA_DRIVEN'
              ? `${batch.dataRows.length} row${batch.dataRows.length !== 1 ? 's' : ''}`
              : `${batch.items.length} item${batch.items.length !== 1 ? 's' : ''}`
          return (
            <span className="text-xs text-[var(--color-text-muted)]">{count}</span>
          )
        },
      },
      {
        header: 'Created',
        accessorKey: 'createdAt',
        size: 160,
        cell: ({ row }) => (
          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            {new Date(row.original.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        header: '',
        id: 'actions',
        size: 80,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Link to="/batch/$batchId" params={{ batchId: row.original.id }}>
              <Button variant="ghost" size="sm" title="Edit">
                <Pencil size={13} />
              </Button>
            </Link>
            <ConfirmPopover
              message={`Delete "${row.original.name}"?`}
              onConfirm={() =>
                deleteMutation.mutate(row.original.id, {
                  onSuccess: () =>
                    toast({ title: `Deleted "${row.original.name}"`, variant: 'success' }),
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
        ),
      },
    ],
    [deleteMutation, toast],
  )

  if (error) {
    return (
      <div className="text-sm text-[var(--color-error)] py-10 text-center">
        Failed to load batches
      </div>
    )
  }

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

      <DataTable
        columns={columns}
        data={paginated}
        isLoading={isLoading}
        emptyText="No batches yet. Create your first one."
      />

      {items.length > pageSize && (
        <div className="flex items-center justify-between mt-3 text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-18 !h-7 !text-xs !py-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <span>
              {items.length === 0
                ? '0 of 0'
                : `${startIndex + 1}–${endIndex} of ${items.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
                className={cn(
                  'p-1 rounded-[var(--radius-sm)] transition-colors',
                  page === 0
                    ? 'opacity-30 cursor-default'
                    : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
                )}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages - 1}
                className={cn(
                  'p-1 rounded-[var(--radius-sm)] transition-colors',
                  page >= totalPages - 1
                    ? 'opacity-30 cursor-default'
                    : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
                )}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
