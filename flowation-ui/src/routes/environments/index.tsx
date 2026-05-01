import { Link } from '@tanstack/react-router'
import { useEnvironments, useDeleteEnvironment } from '@/hooks/use-environments.ts'
import { Button } from '@/components/ui/button.tsx'
import { Skeleton } from '@/components/ui/skeleton.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/use-pagination.ts'
import { useToast } from '@/components/ui/toast.tsx'
import { Select } from '@/components/ui/select.tsx'
import type { Environment } from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
]

type SortField = 'name' | 'createdAt' | 'updatedAt'
type SortDir = 'asc' | 'desc' | null

function sortEnvs(envs: Environment[], field: SortField, dir: SortDir): Environment[] {
  if (!dir) return envs
  return [...envs].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'name': cmp = a.name.localeCompare(b.name); break
      case 'createdAt': cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break
      case 'updatedAt': cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(); break
    }
    return dir === 'desc' ? -cmp : cmp
  })
}

function nextSortDir(current: SortDir): SortDir {
  if (current === null) return 'asc'
  if (current === 'asc') return 'desc'
  return null
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === 'asc') return <ArrowUp size={12} />
  if (dir === 'desc') return <ArrowDown size={12} />
  return <ArrowUpDown size={12} className="opacity-40" />
}

export function EnvironmentsPage() {
  const { data: envs, isLoading, error } = useEnvironments()
  const deleteMutation = useDeleteEnvironment()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(nextSortDir(sortDir))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  const filtered = useMemo(() => {
    let result = envs ?? []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((e) => e.name.toLowerCase().includes(q))
    }
    return result
  }, [envs, search])

  const sorted = useMemo(() => sortEnvs(filtered, sortField, sortDir), [filtered, sortField, sortDir])

  const { page, pageSize, totalPages, setPage, setPageSize, startIndex, endIndex, paginate } = usePagination({
    totalItems: sorted.length,
  })

  const paginated = paginate(sorted)

  return (
    <div className="p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">Environments</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
          Manage variable sets for use in operations and flows
        </p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name..."
            className="h-7 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
        <Link to="/environments/new" className="ml-auto">
          <Button size="sm">
            <Plus size={14} />
            New Environment
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <EnvsTableSkeleton />
      ) : error ? (
        <div className="text-sm text-[var(--color-error)] py-10 text-center">Failed to load environments</div>
      ) : !filtered.length ? (
        <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
          {search.trim() ? 'No environments match your search.' : 'No environments yet. Create your first one.'}
        </div>
      ) : (
        <>
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <SortableHeader label="Name" field="name" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">Variables</th>
                  <SortableHeader label="Created" field="createdAt" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Updated" field="updatedAt" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((env) => (
                  <tr key={env.id} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors">
                    <td className="px-4 py-2.5">
                      <Link
                        to="/environments/$environmentId"
                        params={{ environmentId: env.id }}
                        className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors font-medium"
                      >
                        {env.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs">
                      {env.variables.length} {env.variables.length === 1 ? 'variable' : 'variables'}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs font-mono">
                      {new Date(env.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs font-mono">
                      {new Date(env.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to="/environments/$environmentId" params={{ environmentId: env.id }}>
                          <Button variant="ghost" size="sm" title="Edit">
                            <Pencil size={13} />
                          </Button>
                        </Link>
                        <ConfirmPopover
                          message={`Delete "${env.name}"?`}
                          onConfirm={() => deleteMutation.mutate(env.id, {
                            onSuccess: () => toast({ title: `Deleted "${env.name}"`, variant: 'success' }),
                            onError: (err) => toast({ title: 'Delete failed', description: String(err), variant: 'error' }),
                          })}
                        >
                          <Button variant="ghost" size="sm" title="Delete">
                            <Trash2 size={13} className="text-red-400" />
                          </Button>
                        </ConfirmPopover>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                {sorted.length === 0 ? '0 of 0' : `${startIndex + 1}–${endIndex} of ${sorted.length}`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className={cn('p-1 rounded-[var(--radius-sm)] transition-colors', page === 0 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer')}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className={cn('p-1 rounded-[var(--radius-sm)] transition-colors', page >= totalPages - 1 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer')}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EnvsTableSkeleton() {
  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i} className="px-4 py-2.5"><Skeleton className="h-3 w-14" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
              <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-32" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-16" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
              <td className="px-4 py-2.5"><Skeleton className="h-3.5 w-24" /></td>
              <td className="px-4 py-2.5 text-right"><Skeleton className="h-6 w-12 ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortableHeader({ label, field, currentField, currentDir, onSort }: {
  label: string; field: SortField; currentField: SortField; currentDir: SortDir; onSort: (f: SortField) => void
}) {
  const active = currentField === field
  return (
    <th
      className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] cursor-pointer select-none hover:text-[var(--color-text-secondary)] transition-colors text-left"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon dir={active ? currentDir : null} />
      </span>
    </th>
  )
}
