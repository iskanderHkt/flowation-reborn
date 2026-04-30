import { Link } from '@tanstack/react-router'
import { useOperations, useDeleteOperation } from '@/hooks/use-operations.ts'
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks/use-groups.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Select } from '@/components/ui/select.tsx'
import { QuickRunDrawer } from '@/components/quick-run-drawer.tsx'
import { ConfirmPopover } from '@/components/ui/confirm-popover.tsx'
import { Plus, Pencil, Trash2, Play, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight, FolderOpen, Check, X } from 'lucide-react'
import { useState, useMemo } from 'react'
import { usePagination } from '@/hooks/use-pagination.ts'
import { useToast } from '@/components/ui/toast.tsx'
import type { Operation, OperationType, OperationGroup } from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

const TYPE_BADGES: Record<OperationType, { label: string; variant: 'default' | 'info' | 'warning' }> = {
  HTTP_REQUEST: { label: 'HTTP', variant: 'default' },
  SQL_QUERY: { label: 'SQL', variant: 'info' },
  ASSERTION: { label: 'Assert', variant: 'warning' },
}

const FILTER_OPTIONS: { value: OperationType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'HTTP_REQUEST', label: 'HTTP' },
  { value: 'SQL_QUERY', label: 'SQL' },
  { value: 'ASSERTION', label: 'Assert' },
]

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
]

type SortField = 'name' | 'type' | 'createdAt' | 'updatedAt'
type SortDir = 'asc' | 'desc' | null

function sortOperations(ops: Operation[], field: SortField, dir: SortDir): Operation[] {
  if (!dir) return ops
  const sorted = [...ops].sort((a, b) => {
    let cmp = 0
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'type':
        cmp = a.type.localeCompare(b.type)
        break
      case 'createdAt':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        break
      case 'updatedAt':
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
    }
    return dir === 'desc' ? -cmp : cmp
  })
  return sorted
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

export function OperationsPage() {
  const { data: operations, isLoading, error } = useOperations()
  const { data: groups = [] } = useGroups()
  const deleteMutation = useDeleteOperation()
  const { toast } = useToast()
  const [filter, setFilter] = useState<OperationType | 'ALL'>('ALL')
  const [groupFilter, setGroupFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Sorting — per tab
  const [sortField, setSortField] = useState<SortField>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Quick-run drawer
  const [drawerOp, setDrawerOp] = useState<Operation | null>(null)

  // Groups panel
  const [showGroups, setShowGroups] = useState(false)

  const handleFilterChange = (value: OperationType | 'ALL') => {
    setFilter(value)
    setSortField('updatedAt')
    setSortDir('desc')
    setPage(0)
  }

  const handleGroupFilterChange = (value: string) => {
    setGroupFilter(value)
    setPage(0)
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir(nextSortDir(sortDir))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const filtered = useMemo(() => {
    let result = operations ?? []
    if (filter !== 'ALL') {
      result = result.filter((op) => op.type === filter)
    }
    if (groupFilter === 'UNGROUPED') {
      result = result.filter((op) => !op.groupId)
    } else if (groupFilter !== 'ALL') {
      result = result.filter((op) => op.groupId === groupFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((op) => op.name.toLowerCase().includes(q))
    }
    return result
  }, [operations, filter, groupFilter, search])

  const sorted = useMemo(
    () => sortOperations(filtered, sortField, sortDir),
    [filtered, sortField, sortDir],
  )

  const { page, pageSize, totalPages, setPage, setPageSize, startIndex, endIndex, paginate } = usePagination({
    totalItems: sorted.length,
  })

  const paginated = paginate(sorted)

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Catalog
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            Reusable operations: HTTP requests, SQL queries, assertions
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGroups((v) => !v)}
          className={cn(showGroups && 'bg-[var(--color-bg-elevated)]')}
        >
          <FolderOpen size={13} />
          Groups
          {groups.length > 0 && (
            <span className="ml-1 text-[10px] opacity-60">({groups.length})</span>
          )}
        </Button>
      </div>

      {/* Groups panel */}
      {showGroups && (
        <GroupManagerPanel
          groups={groups}
          toast={toast}
        />
      )}

      {/* Toolbar: filter pills + search + new button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-[var(--radius-md)] transition-colors cursor-pointer',
                filter === opt.value
                  ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="h-7 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-8 pr-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
        {groups.length > 0 && (
          <Select
            value={groupFilter}
            options={[
              { value: 'ALL', label: 'All groups' },
              { value: 'UNGROUPED', label: 'Ungrouped' },
              ...groups.map((g) => ({ value: g.id, label: g.name })),
            ]}
            onChange={(e) => handleGroupFilterChange(e.target.value)}
            className="w-36 !h-7 !text-xs !py-0"
          />
        )}
        <Link to="/catalog/new" className="ml-auto">
          <Button size="sm">
            <Plus size={14} />
            New Operation
          </Button>
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-5 w-5" />
        </div>
      ) : error ? (
        <div className="text-sm text-[var(--color-error)] py-10 text-center">
          Failed to load operations
        </div>
      ) : !filtered.length ? (
        <div className="text-sm text-[var(--color-text-muted)] py-10 text-center">
          {search.trim()
            ? 'No operations match your search.'
            : filter === 'ALL'
              ? 'No operations yet. Create your first one.'
              : 'No operations match this filter.'}
        </div>
      ) : (
        <>
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <SortableHeader
                    label="Name"
                    field="name"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Type"
                    field="type"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] text-left">
                    Group
                  </th>
                  <SortableHeader
                    label="Created"
                    field="createdAt"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Updated"
                    field="updatedAt"
                    currentField={sortField}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((op) => {
                  const badge = TYPE_BADGES[op.type]
                  const group = op.groupId ? groups.find((g) => g.id === op.groupId) : null
                  return (
                    <tr
                      key={op.id}
                      className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-secondary)] transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          to="/catalog/$operationId"
                          params={{ operationId: op.id }}
                          className="text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors font-medium"
                        >
                          {op.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {group ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                            <FolderOpen size={11} className="text-[var(--color-text-muted)]" />
                            {group.name}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs font-mono">
                        {new Date(op.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--color-text-muted)] text-xs font-mono">
                        {new Date(op.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDrawerOp(op)}
                            title="Quick run"
                          >
                            <Play size={13} className="text-green-400" />
                          </Button>
                          <Link
                            to="/catalog/$operationId"
                            params={{ operationId: op.id }}
                          >
                            <Button variant="ghost" size="sm" title="Edit">
                              <Pencil size={13} />
                            </Button>
                          </Link>
                          <ConfirmPopover
                            message={`Delete "${op.name}"?`}
                            onConfirm={() => deleteMutation.mutate(op.id, {
                              onSuccess: () => toast({ title: `Deleted "${op.name}"`, variant: 'success' }),
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
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
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
                {sorted.length === 0
                  ? '0 of 0'
                  : `${startIndex + 1}\u2013${endIndex} of ${sorted.length}`}
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
        </>
      )}

      {/* Quick-run drawer */}
      <QuickRunDrawer operation={drawerOp} onClose={() => setDrawerOp(null)} />
    </div>
  )
}

/* ─── Groups manager panel ────────────────────────── */

function GroupManagerPanel({
  groups,
  toast,
}: {
  groups: OperationGroup[]
  toast: ReturnType<typeof useToast>['toast']
}) {
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await createGroup.mutateAsync({ name })
      setNewName('')
    } catch {
      toast({ title: 'Failed to create group', variant: 'error' })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteGroup.mutateAsync(id)
      toast({ title: `Deleted group "${name}"`, variant: 'success' })
    } catch {
      toast({ title: 'Failed to delete group', variant: 'error' })
    }
  }

  return (
    <div className="mb-4 border border-[var(--color-border)] rounded-[var(--radius-lg)] p-3 bg-[var(--color-bg-secondary)]">
      <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">Operation Groups</p>
      <div className="flex flex-col gap-1 mb-3">
        {groups.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">No groups yet.</p>
        )}
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            group={g}
            editingId={editingId}
            editingName={editingName}
            setEditingId={setEditingId}
            setEditingName={setEditingName}
            onDelete={handleDelete}
            toast={toast}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New group name..."
          className="flex-1 h-7 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <Button size="sm" variant="secondary" onClick={handleCreate} disabled={!newName.trim() || createGroup.isPending}>
          <Plus size={12} />
          Add
        </Button>
      </div>
    </div>
  )
}

function GroupRow({
  group,
  editingId,
  editingName,
  setEditingId,
  setEditingName,
  onDelete,
  toast,
}: {
  group: OperationGroup
  editingId: string | null
  editingName: string
  setEditingId: (id: string | null) => void
  setEditingName: (name: string) => void
  onDelete: (id: string, name: string) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const updateGroup = useUpdateGroup(group.id)
  const isEditing = editingId === group.id

  const handleSave = async () => {
    const name = editingName.trim()
    if (!name || name === group.name) {
      setEditingId(null)
      return
    }
    try {
      await updateGroup.mutateAsync({ name })
      setEditingId(null)
    } catch {
      toast({ title: 'Failed to update group', variant: 'error' })
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') setEditingId(null)
          }}
          className="flex-1 h-6 rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-primary)] focus:outline-none"
        />
        <button onClick={handleSave} className="p-0.5 text-green-400 hover:text-green-300 cursor-pointer">
          <Check size={13} />
        </button>
        <button onClick={() => setEditingId(null)} className="p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 group/row">
      <FolderOpen size={11} className="text-[var(--color-text-muted)] shrink-0" />
      <span className="flex-1 text-xs text-[var(--color-text-secondary)]">{group.name}</span>
      <button
        onClick={() => { setEditingId(group.id); setEditingName(group.name) }}
        className="opacity-0 group-hover/row:opacity-100 p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer transition-opacity"
      >
        <Pencil size={11} />
      </button>
      <ConfirmPopover message={`Delete group "${group.name}"? Operations will be ungrouped.`} onConfirm={() => onDelete(group.id, group.name)}>
        <button className="opacity-0 group-hover/row:opacity-100 p-0.5 text-red-400 hover:text-red-300 cursor-pointer transition-opacity">
          <Trash2 size={11} />
        </button>
      </ConfirmPopover>
    </div>
  )
}

/* ─── Sortable column header ──────────────────────── */

function SortableHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  align = 'left',
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDir: SortDir
  onSort: (field: SortField) => void
  align?: 'left' | 'right'
}) {
  const active = currentField === field
  return (
    <th
      className={cn(
        'px-4 py-2.5 text-xs font-medium text-[var(--color-text-muted)] cursor-pointer select-none hover:text-[var(--color-text-secondary)] transition-colors',
        align === 'right' ? 'text-right' : 'text-left',
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon dir={active ? currentDir : null} />
      </span>
    </th>
  )
}
