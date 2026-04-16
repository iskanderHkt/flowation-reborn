import { useNavigate, useParams } from '@tanstack/react-router'
import {
  useBatch,
  useUpdateBatch,
  useSetBatchItems,
  useSetBatchDataRows,
  useStartBatchRun,
  useBatchRuns,
  useBatchRun,
} from '@/hooks/use-batches.ts'
import { useFlows } from '@/hooks/use-flows.ts'
import { useOperations } from '@/hooks/use-operations.ts'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Spinner } from '@/components/ui/spinner.tsx'
import { Tabs } from '@/components/ui/tabs.tsx'
import { useToast } from '@/components/ui/toast.tsx'
import { ArrowLeft, Plus, Trash2, Play, X, Check, GitBranch, Zap } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { BatchItemType, BatchRunStatus, BatchItemRequest, BatchRun } from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

/* ── Status badge for batch runs ────────────────────── */

const RUN_STATUS_BADGE: Record<BatchRunStatus, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'muted' }> = {
  PENDING:   { label: 'Pending',   variant: 'muted' },
  RUNNING:   { label: 'Running',   variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  PARTIAL:   { label: 'Partial',   variant: 'warning' },
  FAILED:    { label: 'Failed',    variant: 'error' },
}

const ITEM_STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'error' | 'warning' | 'info' | 'muted' }> = {
  PENDING:   { label: 'Pending',   variant: 'muted' },
  RUNNING:   { label: 'Running',   variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED:    { label: 'Failed',    variant: 'error' },
  SKIPPED:   { label: 'Skipped',   variant: 'muted' },
}

/* ── Add-item dialog ─────────────────────────────────── */

function AddItemDialog({
  onAdd,
  onClose,
  multiMode,
}: {
  onAdd: (item: BatchItemRequest) => void
  onClose: () => void
  multiMode: boolean
}) {
  const { data: flows } = useFlows()
  const { data: operations } = useOperations()
  const [tab, setTab] = useState<'flows' | 'operations'>('flows')
  const [search, setSearch] = useState('')

  const filteredFlows = (flows ?? []).filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredOps = (operations ?? []).filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[480px] max-h-[500px] flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {multiMode ? 'Add Item' : 'Select Item'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 shrink-0">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-7 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Tabs */}
        <div className="px-4 pt-2 shrink-0">
          <Tabs
            tabs={[
              { id: 'flows', label: 'Flows' },
              { id: 'operations', label: 'Operations' },
            ]}
            activeTab={tab}
            onChange={(id) => setTab(id as 'flows' | 'operations')}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {tab === 'flows' ? (
            filteredFlows.length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No flows found</p>
            ) : (
              filteredFlows.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onAdd({ itemType: 'FLOW', referenceId: f.id })
                    onClose()
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius-md)] text-left hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer group"
                >
                  <GitBranch size={13} className="text-[var(--color-accent)] shrink-0" />
                  <span className="text-xs text-[var(--color-text-primary)] truncate">{f.name}</span>
                </button>
              ))
            )
          ) : filteredOps.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">No operations found</p>
          ) : (
            filteredOps.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  onAdd({ itemType: 'OPERATION', referenceId: o.id })
                  onClose()
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-[var(--radius-md)] text-left hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer group"
              >
                <Zap size={13} className="text-yellow-400 shrink-0" />
                <span className="text-xs text-[var(--color-text-primary)] truncate">{o.name}</span>
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)] font-mono shrink-0">{o.type}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Dataset editor (DATA_DRIVEN) ────────────────────── */

interface DataRow {
  variables: Record<string, string>
}

function DatasetEditor({
  columns,
  rows,
  onChange,
}: {
  columns: string[]
  rows: DataRow[]
  onChange: (rows: DataRow[]) => void
}) {
  const [newCol, setNewCol] = useState('')

  const addColumn = () => {
    const col = newCol.trim()
    if (!col || columns.includes(col)) return
    const updatedRows = rows.map((r) => ({ variables: { ...r.variables, [col]: '' } }))
    onChange(updatedRows)
    setNewCol('')
  }

  const addRow = () => {
    const emptyRow: DataRow = { variables: Object.fromEntries(columns.map((c) => [c, ''])) }
    onChange([...rows, emptyRow])
  }

  const updateCell = (rowIdx: number, col: string, value: string) => {
    const updated = rows.map((r, i) =>
      i === rowIdx ? { variables: { ...r.variables, [col]: value } } : r,
    )
    onChange(updated)
  }

  const removeRow = (rowIdx: number) => {
    onChange(rows.filter((_, i) => i !== rowIdx))
  }

  const removeColumn = (col: string) => {
    const updated = rows.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [col]: _removed, ...rest } = r.variables
      return { variables: rest }
    })
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      {/* Add column */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newCol}
          onChange={(e) => setNewCol(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addColumn()}
          placeholder="Column name (variable key)"
          className="h-7 flex-1 max-w-xs rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
        />
        <Button size="sm" variant="secondary" onClick={addColumn} disabled={!newCol.trim()}>
          Add Column
        </Button>
      </div>

      {columns.length === 0 ? (
        <p className="text-xs text-[var(--color-text-muted)] py-4 text-center">
          Add at least one column to define dataset variables.
        </p>
      ) : (
        <>
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <th className="px-3 py-2 text-[var(--color-text-muted)] font-medium text-left w-8">#</th>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-[var(--color-text-muted)] font-medium text-left">
                      <span className="inline-flex items-center gap-1.5">
                        <code className="font-mono">{col}</code>
                        <button
                          onClick={() => removeColumn(col)}
                          className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-[var(--color-border-subtle)] last:border-0"
                  >
                    <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-mono">{rowIdx + 1}</td>
                    {columns.map((col) => (
                      <td key={col} className="px-2 py-1">
                        <input
                          type="text"
                          value={row.variables[col] ?? ''}
                          onChange={(e) => updateCell(rowIdx, col, e.target.value)}
                          className="h-6 w-full rounded-[var(--radius-sm)] border border-transparent bg-transparent px-1.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] focus:bg-[var(--color-bg-secondary)] transition-colors"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1">
                      <button
                        onClick={() => removeRow(rowIdx)}
                        className="p-0.5 text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="secondary" onClick={addRow}>
            <Plus size={12} />
            Add Row
          </Button>
        </>
      )}
    </div>
  )
}

/* ── Run result panel ────────────────────────────────── */

function RunResultPanel({ batchId, runId }: { batchId: string; runId: string }) {
  const isTerminal = (status: BatchRunStatus) =>
    status === 'COMPLETED' || status === 'FAILED' || status === 'PARTIAL'

  const [polling, setPolling] = useState(true)
  const { data: display } = useBatchRun(batchId, runId, polling)

  useEffect(() => {
    if (display && isTerminal(display.status)) {
      setPolling(false)
    }
  }, [display?.status])

  if (!display) return <Spinner className="h-4 w-4" />

  const badge = RUN_STATUS_BADGE[display.status]

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Run result
        </span>
        <div className="flex items-center gap-2">
          {display.status === 'RUNNING' && <Spinner className="h-3 w-3" />}
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </div>
      {display.items.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]">
              <th className="px-4 py-2 text-[var(--color-text-muted)] font-medium text-left">Name</th>
              <th className="px-4 py-2 text-[var(--color-text-muted)] font-medium text-left">Type</th>
              <th className="px-4 py-2 text-[var(--color-text-muted)] font-medium text-left">Status</th>
              <th className="px-4 py-2 text-[var(--color-text-muted)] font-medium text-right">Duration</th>
            </tr>
          </thead>
          <tbody>
            {display.items.map((item, i) => {
              const itemBadge = ITEM_STATUS_BADGE[item.status] ?? ITEM_STATUS_BADGE.PENDING
              return (
                <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  <td className="px-4 py-2 text-[var(--color-text-primary)] font-medium truncate max-w-xs">{item.name}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {item.itemType === 'FLOW' ? (
                      <span className="inline-flex items-center gap-1"><GitBranch size={10} /> Flow</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Zap size={10} /> Operation</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={itemBadge.variant}>{itemBadge.label}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right text-[var(--color-text-muted)] font-mono">
                    {item.durationMs != null ? `${item.durationMs}ms` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

/* ── Run history ─────────────────────────────────────── */

function RunHistory({
  batchId,
  activeRunId,
  onSelect,
}: {
  batchId: string
  activeRunId: string | null
  onSelect: (runId: string) => void
}) {
  const { data: runsPage } = useBatchRuns(batchId)
  const runs = runsPage?.content ?? []

  if (!runs.length) return null

  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">History</p>
      <div className="space-y-1.5">
        {runs.map((run) => {
          const badge = RUN_STATUS_BADGE[run.status]
          const active = run.id === activeRunId
          return (
            <button
              key={run.id}
              onClick={() => onSelect(run.id)}
              className={cn(
                'flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-md)] border text-xs transition-colors cursor-pointer text-left',
                active
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                  : 'border-[var(--color-border)] hover:bg-[var(--color-bg-elevated)]',
              )}
            >
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <span className="text-[var(--color-text-muted)] font-mono">
                {run.startedAt
                  ? new Date(run.startedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : 'Pending…'}
              </span>
              <span className="ml-auto text-[var(--color-text-muted)] font-mono text-[10px]">
                {run.id.substring(0, 8)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main edit page ──────────────────────────────────── */

export function BatchEditPage() {
  const { batchId } = useParams({ strict: false }) as { batchId: string }
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: batch, isLoading, error } = useBatch(batchId)
  const { data: flows } = useFlows()
  const { data: operations } = useOperations()
  const updateMutation = useUpdateBatch(batchId)
  const setItemsMutation = useSetBatchItems(batchId)
  const setDataRowsMutation = useSetBatchDataRows(batchId)
  const startRunMutation = useStartBatchRun(batchId)

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [pendingItems, setPendingItems] = useState<BatchItemRequest[] | null>(null)
  const [dataRows, setDataRows] = useState<DataRow[] | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)

  // Sync local state from server
  useEffect(() => {
    if (!batch) return
    if (pendingItems === null) {
      setPendingItems(batch.items.map((i) => ({ itemType: i.itemType, referenceId: i.referenceId })))
    }
    if (dataRows === null) {
      setDataRows(
        batch.dataRows.map((r) =>
          ({ variables: Object.fromEntries(Object.entries(r.variables).map(([k, v]) => [k, String(v)])) }),
        ),
      )
    }
  }, [batch])

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--color-error)]">
        Failed to load batch
      </div>
    )
  }

  const items = pendingItems ?? []
  const rows = dataRows ?? []

  // Derive columns from data rows
  const columns = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.variables))),
  )

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue.trim() === batch.name) {
      setEditingName(false)
      return
    }
    try {
      await updateMutation.mutateAsync({ name: nameValue.trim() })
      setEditingName(false)
    } catch (err) {
      toast({ title: 'Failed to rename', description: String(err), variant: 'error' })
    }
  }

  const handleAddItem = (item: BatchItemRequest) => {
    if (batch.mode === 'DATA_DRIVEN') {
      setPendingItems([item])
    } else {
      setPendingItems([...items, item])
    }
  }

  const handleRemoveItem = (idx: number) => {
    setPendingItems(items.filter((_, i) => i !== idx))
  }

  const handleSaveItems = async () => {
    try {
      await setItemsMutation.mutateAsync({ items })
      setPendingItems(null)
      toast({ title: 'Items saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to save items', description: String(err), variant: 'error' })
    }
  }

  const handleSaveDataRows = async () => {
    try {
      await setDataRowsMutation.mutateAsync({
        rows: rows.map((r) => r.variables as Record<string, unknown>),
      })
      setDataRows(null)
      toast({ title: 'Dataset saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to save dataset', description: String(err), variant: 'error' })
    }
  }

  const handleRun = async () => {
    try {
      const result = await startRunMutation.mutateAsync()
      setSelectedRunId(result.runId)
      toast({ title: 'Batch run started', variant: 'success' })
    } catch (err) {
      toast({ title: 'Failed to start run', description: String(err), variant: 'error' })
    }
  }

  const resolveItemName = (item: BatchItemRequest): string => {
    if (item.itemType === 'FLOW') {
      return flows?.find((f) => f.id === item.referenceId)?.name ?? item.referenceId.substring(0, 8) + '…'
    }
    return operations?.find((o) => o.id === item.referenceId)?.name ?? item.referenceId.substring(0, 8) + '…'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
        <button
          onClick={() => navigate({ to: '/batch' })}
          className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>

        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="h-7 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-bg-secondary)] px-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
            />
            <button
              onClick={handleSaveName}
              className="p-1 text-green-400 hover:text-green-300 transition-colors cursor-pointer"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setEditingName(false)}
              className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setNameValue(batch.name); setEditingName(true) }}
            className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            {batch.name}
          </button>
        )}

        <Badge variant={batch.mode === 'DATA_DRIVEN' ? 'info' : 'default'}>
          {batch.mode === 'DATA_DRIVEN' ? 'Data-Driven' : 'Multi'}
        </Badge>

        <div className="ml-auto">
          <Button
            size="sm"
            onClick={handleRun}
            disabled={startRunMutation.isPending}
          >
            {startRunMutation.isPending ? <Spinner className="h-3 w-3" /> : <Play size={13} />}
            Run
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-8">

        {/* Items section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                {batch.mode === 'DATA_DRIVEN' ? 'Target' : 'Items'}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {batch.mode === 'DATA_DRIVEN'
                  ? 'One flow or operation executed once per dataset row.'
                  : 'Each item runs once in parallel.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(batch.mode === 'MULTI' || items.length === 0) && (
                <Button size="sm" variant="secondary" onClick={() => setShowAddDialog(true)}>
                  <Plus size={13} />
                  {batch.mode === 'DATA_DRIVEN' ? 'Select' : 'Add'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSaveItems}
                disabled={setItemsMutation.isPending}
              >
                {setItemsMutation.isPending ? <Spinner className="h-3 w-3" /> : null}
                Save
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] py-8 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">
                {batch.mode === 'DATA_DRIVEN' ? 'No target selected.' : 'No items added yet.'}
              </p>
            </div>
          ) : (
            <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border-subtle)] last:border-0"
                >
                  {item.itemType === 'FLOW' ? (
                    <GitBranch size={13} className="text-[var(--color-accent)] shrink-0" />
                  ) : (
                    <Zap size={13} className="text-yellow-400 shrink-0" />
                  )}
                  <span className="text-xs text-[var(--color-text-primary)]">
                    {resolveItemName(item)}
                  </span>
                  <Badge variant={item.itemType === 'FLOW' ? 'default' : 'muted'}>
                    {item.itemType === 'FLOW' ? 'Flow' : 'Operation'}
                  </Badge>
                  {batch.mode === 'MULTI' && (
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      className="ml-auto p-1 text-[var(--color-text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                  {batch.mode === 'DATA_DRIVEN' && (
                    <button
                      onClick={() => setShowAddDialog(true)}
                      className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Dataset section (DATA_DRIVEN only) */}
        {batch.mode === 'DATA_DRIVEN' && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Dataset</h2>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Each row is a separate execution with its own variable values.
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleSaveDataRows}
                disabled={setDataRowsMutation.isPending}
              >
                {setDataRowsMutation.isPending ? <Spinner className="h-3 w-3" /> : null}
                Save Dataset
              </Button>
            </div>
            <DatasetEditor
              columns={columns}
              rows={rows}
              onChange={setDataRows}
            />
          </section>
        )}

        {/* Run result */}
        {selectedRunId && (
          <section>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Latest Run</h2>
            <RunResultPanel batchId={batchId} runId={selectedRunId} />
          </section>
        )}

        {/* Run history */}
        <section>
          <RunHistory
            batchId={batchId}
            activeRunId={selectedRunId}
            onSelect={setSelectedRunId}
          />
        </section>
      </div>

      {/* Add item dialog */}
      {showAddDialog && (
        <AddItemDialog
          onAdd={handleAddItem}
          onClose={() => setShowAddDialog(false)}
          multiMode={batch.mode === 'MULTI'}
        />
      )}
    </div>
  )
}
