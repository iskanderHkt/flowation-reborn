import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Select } from '@/components/ui/select.tsx'
import { OperationForm, defaultConfig } from '@/components/operation-form.tsx'
import { useFlowSteps } from '@/hooks/use-flows.ts'
import { Spinner } from '@/components/ui/spinner.tsx'
import {
  X, Zap, GitBranch, Link, Unlink, Plus, BookOpen,
  Search, Globe, Database, CheckSquare, Eye, EyeOff,
} from 'lucide-react'
import type {
  Operation, Flow, StepKind, Binding, FlowStepCreateRequest,
  OnFailStrategy, OperationConfig, OperationType,
  HttpOperationConfig, SqlOperationConfig, AssertOperationConfig,
} from '@/api/types.ts'
import { cn } from '@/lib/cn.ts'

/* ─── Types ────────────────────────────────────────────── */

interface CreateNewParams {
  name: string
  config: OperationConfig
  saveToСatalog: boolean
  binding: Binding
  onFail: OnFailStrategy
}

interface AddStepDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (request: FlowStepCreateRequest) => void
  onCreateAndAdd: (params: CreateNewParams) => Promise<void>
  operations: Operation[]
  flows: Flow[]
  currentFlowId: string
}

type SourceMode = 'catalog' | 'create-new'

/* ─── Constants ────────────────────────────────────────── */

const TYPE_META: Record<OperationType, { label: string; icon: typeof Globe; color: string }> = {
  HTTP_REQUEST: { label: 'HTTP',   icon: Globe,       color: 'text-blue-400' },
  SQL_QUERY:    { label: 'SQL',    icon: Database,    color: 'text-purple-400' },
  ASSERTION:    { label: 'Assert', icon: CheckSquare, color: 'text-amber-400' },
}

const TYPE_ORDER: OperationType[] = ['HTTP_REQUEST', 'SQL_QUERY', 'ASSERTION']

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-green-500/15 text-green-400 border-green-500/30',
  POST:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
  PUT:    'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PATCH:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const COMPARATOR_META: Record<string, { label: string; color: string }> = {
  EQ:          { label: '=',          color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  NEQ:         { label: '≠',          color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  CONTAINS:    { label: '⊃ contains', color: 'bg-green-500/15 text-green-400 border-green-500/30' },
  REGEX:       { label: '~ regex',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  GT:          { label: '>',          color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  LT:          { label: '<',          color: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  IS_NULL:     { label: 'is null',    color: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]' },
  IS_NOT_NULL: { label: 'not null',   color: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]' },
}

const SQL_KEYWORDS = new Set([
  'SELECT','FROM','WHERE','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','ON','AS',
  'INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','DROP','ALTER','TRUNCATE',
  'TABLE','INDEX','VIEW','AND','OR','NOT','IN','IS','NULL','LIKE','ILIKE','ORDER',
  'BY','GROUP','HAVING','LIMIT','OFFSET','DISTINCT','COUNT','SUM','AVG','MAX','MIN',
  'CASE','WHEN','THEN','ELSE','END','WITH','UNION','ALL','RETURNING','EXISTS',
])

/* ─── SQL mini-highlight ───────────────────────────────── */

function SqlHighlight({ query }: { query: string }) {
  const tokens = query.replace(/\s+/g, ' ').trim().split(/(\s+)/)
  return (
    <>
      {tokens.map((token, i) =>
        SQL_KEYWORDS.has(token.toUpperCase())
          ? <span key={i} className="text-blue-400 font-semibold">{token}</span>
          : <span key={i} className="text-[var(--color-text-muted)]">{token}</span>
      )}
    </>
  )
}

/* ─── OperationRow — compact summary ──────────────────── */

function OperationRow({
  name, config, isDetached,
}: {
  name: string
  config: OperationConfig
  isDetached?: boolean
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{name}</span>
        {isDetached && (
          <span className="text-[10px] border rounded px-1 text-amber-400 border-amber-500/30 shrink-0">detached</span>
        )}
      </div>

      {config.type === 'HTTP_REQUEST' && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[10px] font-semibold border rounded px-1.5 py-px shrink-0',
            METHOD_COLORS[config.method] ?? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]')}>
            {config.method}
          </span>
          <span className="text-xs text-[var(--color-text-muted)] font-mono truncate">{config.url || '—'}</span>
        </div>
      )}

      {config.type === 'SQL_QUERY' && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-semibold border rounded px-1.5 py-px shrink-0 bg-purple-500/15 text-purple-400 border-purple-500/30">
            {config.dbType}
          </span>
          <span className="text-xs font-mono truncate min-w-0">
            <SqlHighlight query={config.query || '—'} />
          </span>
        </div>
      )}

      {config.type === 'ASSERTION' && (() => {
        const cmp = COMPARATOR_META[config.comparator] ?? { label: config.comparator, color: '' }
        return (
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-xs font-mono text-[var(--color-text-muted)] truncate max-w-[140px]">
              {config.expression || '—'}
            </span>
            <span className={cn('text-[10px] font-semibold border rounded px-1.5 py-px shrink-0', cmp.color)}>
              {cmp.label}
            </span>
            {config.expected && (
              <span className="text-xs font-mono text-[var(--color-text-muted)]">{config.expected}</span>
            )}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── OperationDetail — full config view ──────────────── */

function OperationDetail({ config }: { config: OperationConfig }) {
  if (config.type === 'HTTP_REQUEST') {
    const hasHeaders = Object.keys(config.headers ?? {}).length > 0
    return (
      <div className="flex flex-col gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-semibold border rounded px-1.5 py-px',
            METHOD_COLORS[config.method] ?? 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]')}>
            {config.method}
          </span>
          <span className="text-[var(--color-text-secondary)] break-all">{config.url || '—'}</span>
        </div>
        {config.timeoutMs && (
          <div className="text-[var(--color-text-muted)]">timeout: {config.timeoutMs}ms</div>
        )}
        {hasHeaders && (
          <div>
            <div className="text-[var(--color-text-muted)] mb-1 font-sans font-medium text-[10px] uppercase tracking-wide">Headers</div>
            {Object.entries(config.headers).map(([k, v]) => (
              <div key={k} className="flex gap-1.5">
                <span className="text-blue-300 shrink-0">{k}:</span>
                <span className="text-[var(--color-text-secondary)] break-all">{v}</span>
              </div>
            ))}
          </div>
        )}
        {config.body && (
          <div>
            <div className="text-[var(--color-text-muted)] mb-1 font-sans font-medium text-[10px] uppercase tracking-wide">Body</div>
            <span className="text-[var(--color-text-secondary)] break-all whitespace-pre-wrap">{config.body}</span>
          </div>
        )}
      </div>
    )
  }

  if (config.type === 'SQL_QUERY') {
    return (
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold border rounded px-1.5 py-px bg-purple-500/15 text-purple-400 border-purple-500/30">
            {config.dbType}
          </span>
          <span className="font-mono text-[var(--color-text-muted)] truncate text-[10px]">{config.connectionString || '—'}</span>
        </div>
        <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">
          <SqlHighlight query={config.query || '—'} />
        </div>
      </div>
    )
  }

  if (config.type === 'ASSERTION') {
    const cmp = COMPARATOR_META[config.comparator] ?? { label: config.comparator, color: '' }
    return (
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap font-mono">
          <span className="text-[var(--color-text-secondary)]">{config.expression || '—'}</span>
          <span className={cn('text-[10px] font-semibold border rounded px-1.5 py-px', cmp.color)}>{cmp.label}</span>
          {config.expected && <span className="text-[var(--color-text-secondary)]">{config.expected}</span>}
        </div>
      </div>
    )
  }

  return null
}

/* ─── OperationCard — row + lookup ────────────────────── */

function OperationCard({
  name,
  config,
  isDetached,
  isSelected,
  lookupId,
  openLookupId,
  onSelect,
  onToggleLookup,
}: {
  name: string
  config: OperationConfig
  isDetached?: boolean
  isSelected?: boolean
  lookupId: string
  openLookupId: string | null
  onSelect?: () => void
  onToggleLookup: (id: string) => void
}) {
  const lookupOpen = openLookupId === lookupId

  return (
    <div className={cn(
      'rounded-[var(--radius-sm)] border transition-colors',
      isSelected
        ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)]'
        : 'border-transparent hover:border-[var(--color-border)]',
    )}>
      {/* Main row */}
      <div className="flex items-start gap-1">
        {/* Selectable area */}
        <div
          onClick={onSelect}
          className={cn('flex-1 min-w-0 px-3 py-2.5', onSelect && 'cursor-pointer')}
        >
          <OperationRow name={name} config={config} isDetached={isDetached} />
        </div>

        {/* Lookup button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLookup(lookupId) }}
          title={lookupOpen ? 'Hide details' : 'View details'}
          className={cn(
            'p-2 mt-1.5 mr-1.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer shrink-0',
            lookupOpen
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]',
          )}
        >
          {lookupOpen ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>

      {/* Expanded detail */}
      {lookupOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-[var(--color-border)]/50">
          <div className="mt-2.5 p-2.5 rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
            <OperationDetail config={config} />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Operation Picker ─────────────────────────────────── */

function OperationPicker({
  operations, selected, onSelect,
}: {
  operations: Operation[]
  selected: string
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [openLookupId, setOpenLookupId] = useState<string | null>(null)

  const toggleLookup = (id: string) => setOpenLookupId((prev) => prev === id ? null : id)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? operations.filter((op) => op.name.toLowerCase().includes(q)) : operations
  }, [operations, search])

  const grouped = useMemo(() =>
    TYPE_ORDER
      .map((type) => ({ type, items: filtered.filter((op) => op.type === type) }))
      .filter((g) => g.items.length > 0),
    [filtered],
  )

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative shrink-0">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search operations..."
          className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
        />
      </div>
      <div className="flex flex-col gap-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5 flex-1">
        {grouped.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
            {search ? 'No matches' : 'No operations in catalog'}
          </p>
        ) : (
          grouped.map(({ type, items }) => {
            const meta = TYPE_META[type]
            const Icon = meta.icon
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Icon size={12} className={meta.color} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{meta.label}</span>
                  <span className="text-xs text-[var(--color-text-muted)] opacity-50">{items.length}</span>
                </div>
                {items.map((op) => (
                  <OperationCard
                    key={op.id}
                    name={op.name}
                    config={op.configTemplate}
                    isSelected={op.id === selected}
                    lookupId={op.id}
                    openLookupId={openLookupId}
                    onSelect={() => onSelect(op.id)}
                    onToggleLookup={toggleLookup}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/* ─── Flow Steps Preview ───────────────────────────────── */

function FlowStepsPreview({
  flowId, operations, openLookupId, onToggleLookup,
}: {
  flowId: string
  operations: Operation[]
  openLookupId: string | null
  onToggleLookup: (id: string) => void
}) {
  const { data: steps = [], isLoading } = useFlowSteps(flowId)

  if (isLoading) {
    return <div className="flex items-center justify-center py-6"><Spinner className="h-4 w-4 text-[var(--color-text-muted)]" /></div>
  }

  if (steps.length === 0) {
    return <p className="text-sm text-[var(--color-text-muted)] italic py-4 text-center">No steps yet</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {steps.map((step, i) => {
        if (step.stepKind === 'OPERATION_STEP') {
          const isDetached = step.binding === 'DETACHED'
          const op = step.operationId ? operations.find((o) => o.id === step.operationId) : null
          const cfg = op?.configTemplate ?? step.ownConfig ?? step.configOverride
          const cfgType = cfg?.type ?? null
          const name = op?.name ?? (cfgType ? `${TYPE_META[cfgType].label} step` : 'Step')
          return (
            <div key={step.id} className="flex gap-2 items-start">
              <span className="text-xs text-[var(--color-text-muted)] w-5 shrink-0 pt-3">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                {cfg
                  ? (
                    <OperationCard
                      name={name}
                      config={cfg}
                      isDetached={isDetached}
                      lookupId={step.id}
                      openLookupId={openLookupId}
                      onToggleLookup={onToggleLookup}
                    />
                  )
                  : <span className="text-sm text-[var(--color-text-muted)] px-3 py-2.5 block">{name}</span>
                }
              </div>
            </div>
          )
        }
        return (
          <div key={step.id} className="flex gap-2 items-center px-3 py-2.5">
            <span className="text-xs text-[var(--color-text-muted)] w-5 shrink-0">{i + 1}.</span>
            <GitBranch size={13} className="shrink-0 text-[var(--color-text-muted)]" />
            <span className="text-sm text-[var(--color-text-secondary)] italic">nested flow</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Flow Picker ──────────────────────────────────────── */

function FlowPicker({
  flows, operations, selected, onSelect,
}: {
  flows: Flow[]
  operations: Operation[]
  selected: string
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [openLookupId, setOpenLookupId] = useState<string | null>(null)
  const toggleLookup = (id: string) => setOpenLookupId((prev) => prev === id ? null : id)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? flows.filter((f) => f.name.toLowerCase().includes(q)) : flows
  }, [flows, search])

  const selectedFlow = flows.find((f) => f.id === selected)

  return (
    <div className="flex gap-3 h-full min-h-0">
      {/* Flow list */}
      <div className="flex flex-col gap-2 w-[220px] shrink-0 h-full">
        <div className="relative shrink-0">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flows..."
            className="h-8 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-8 pr-3 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5 flex-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)] text-center py-6">
              {search ? 'No matches' : 'No other flows'}
            </p>
          ) : (
            filtered.map((f) => {
              const isSelected = f.id === selected
              return (
                <button
                  key={f.id}
                  onClick={() => { onSelect(f.id); setOpenLookupId(null) }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-[var(--radius-sm)] border transition-colors cursor-pointer',
                    isSelected
                      ? 'bg-[var(--color-accent-subtle)] border-[var(--color-accent)]'
                      : 'border-transparent hover:bg-[var(--color-bg-elevated)]',
                  )}
                >
                  <div className={cn(
                    'text-sm font-medium flex items-center gap-1.5',
                    isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]',
                  )}>
                    <GitBranch size={13} className="shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                  {f.description && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate pl-5">{f.description}</div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Steps panel */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center gap-2 shrink-0 h-8">
          {selectedFlow
            ? (
              <>
                <GitBranch size={13} className="text-[var(--color-accent)] shrink-0" />
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate">{selectedFlow.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">· steps</span>
              </>
            )
            : <span className="text-sm text-[var(--color-text-muted)]">Select a flow to preview its steps</span>
          }
        </div>
        <div className="flex-1 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-1.5">
          {selected
            ? (
              <FlowStepsPreview
                flowId={selected}
                operations={operations}
                openLookupId={openLookupId}
                onToggleLookup={toggleLookup}
              />
            )
            : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-[var(--color-text-muted)]">No flow selected</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}

/* ─── Toggle button helper ─────────────────────────────── */

function ToggleBtn({
  active, disabled, onClick, children,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors',
        disabled
          ? 'opacity-35 cursor-not-allowed border-[var(--color-border)] text-[var(--color-text-muted)]'
          : active
            ? 'cursor-pointer border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
            : 'cursor-pointer border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
      )}
    >
      {children}
    </button>
  )
}

/* ─── Main dialog ──────────────────────────────────────── */

export function AddStepDialog({
  open, onClose, onAdd, onCreateAndAdd, operations, flows, currentFlowId,
}: AddStepDialogProps) {
  const [stepKind, setStepKind] = useState<StepKind>('OPERATION_STEP')
  const [sourceMode, setSourceMode] = useState<SourceMode>('catalog')
  const [binding, setBinding] = useState<Binding>('LINKED')
  const [selectedOperationId, setSelectedOperationId] = useState('')
  const [selectedFlowId, setSelectedFlowId] = useState('')
  const [onFail, setOnFail] = useState<OnFailStrategy>('STOP_FLOW')

  const [newName, setNewName] = useState('')
  const [newConfig, setNewConfig] = useState<OperationConfig>(defaultConfig('HTTP_REQUEST'))
  const [saveToСatalog, setSaveToСatalog] = useState(true)
  const [newOnFail, setNewOnFail] = useState<OnFailStrategy>('STOP_FLOW')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!open) return null

  const availableFlows = flows.filter((f) => f.id !== currentFlowId)
  const isSubFlow = stepKind === 'FLOW_STEP'
  const isCreateNew = !isSubFlow && sourceMode === 'create-new'

  const resetAndClose = () => {
    setStepKind('OPERATION_STEP')
    setSourceMode('catalog')
    setSelectedOperationId('')
    setSelectedFlowId('')
    setOnFail('STOP_FLOW')
    setBinding('LINKED')
    setNewName('')
    setNewConfig(defaultConfig('HTTP_REQUEST'))
    setSaveToСatalog(true)
    setNewOnFail('STOP_FLOW')
    onClose()
  }

  const handleSubmit = async () => {
    if (isCreateNew) {
      if (!newName.trim()) return
      setIsSubmitting(true)
      try {
        await onCreateAndAdd({ name: newName.trim(), config: newConfig, saveToСatalog, binding: effectiveBinding, onFail: newOnFail })
        resetAndClose()
      } finally {
        setIsSubmitting(false)
      }
    } else if (isSubFlow) {
      if (!selectedFlowId) return
      onAdd({ stepKind: 'FLOW_STEP', nestedFlowId: selectedFlowId, onFail })
      resetAndClose()
    } else {
      if (!selectedOperationId) return
      onAdd({
        stepKind: 'OPERATION_STEP',
        binding,
        ...(binding === 'LINKED' ? { operationId: selectedOperationId } : { sourceOperationId: selectedOperationId }),
        onFail,
      })
      resetAndClose()
    }
  }

  // In Create New mode binding is derived from saveToСatalog — not user-controlled
  const effectiveBinding: Binding = isCreateNew ? (saveToСatalog ? 'LINKED' : 'DETACHED') : binding
  // Display: when Create New + no catalog, nothing is highlighted (binding concept doesn't apply)
  const displayBinding: Binding | null = isCreateNew ? (saveToСatalog ? 'LINKED' : null) : binding

  const isSubmitDisabled = isCreateNew
    ? !newName.trim() || isSubmitting
    : isSubFlow ? !selectedFlowId : !selectedOperationId

  const activeOnFail = isCreateNew ? newOnFail : onFail
  const setActiveOnFail = (v: OnFailStrategy) => isCreateNew ? setNewOnFail(v) : setOnFail(v)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={resetAndClose} />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[860px] h-[600px] flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)] shrink-0">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Add Step</h3>
          <button onClick={resetAndClose} className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer">
            <X size={14} />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: controls */}
          <div className="w-[210px] shrink-0 flex flex-col gap-5 px-5 py-5 border-r border-[var(--color-border)] overflow-y-auto">

            <div>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Step Type</label>
              <div className="flex flex-col gap-1.5">
                <ToggleBtn active={!isSubFlow} onClick={() => setStepKind('OPERATION_STEP')}>
                  <Zap size={13} /> Operation
                </ToggleBtn>
                <ToggleBtn active={isSubFlow} onClick={() => setStepKind('FLOW_STEP')}>
                  <GitBranch size={13} /> Sub-flow
                </ToggleBtn>
              </div>
            </div>

            <div className={cn(isSubFlow && 'opacity-40 pointer-events-none')}>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Source</label>
              <div className="flex flex-col gap-1.5">
                <ToggleBtn active={sourceMode === 'catalog'} onClick={() => setSourceMode('catalog')}>
                  <BookOpen size={13} /> From Catalog
                </ToggleBtn>
                <ToggleBtn active={sourceMode === 'create-new'} onClick={() => setSourceMode('create-new')}>
                  <Plus size={13} /> Create New
                </ToggleBtn>
              </div>
            </div>

            <div className={cn((isSubFlow || isCreateNew) && 'opacity-40 pointer-events-none')}>
              <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">
                Binding{isCreateNew && <span className="ml-1 text-[10px] text-[var(--color-text-muted)] font-normal">(auto)</span>}
              </label>
              <div className="flex flex-col gap-1.5">
                <ToggleBtn active={displayBinding === 'LINKED'} onClick={() => setBinding('LINKED')}>
                  <Link size={12} /> Linked
                </ToggleBtn>
                <button
                  onClick={() => setBinding('DETACHED')}
                  className={cn(
                    'flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border text-xs font-medium transition-colors cursor-pointer',
                    displayBinding === 'DETACHED'
                      ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                      : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]',
                  )}
                >
                  <Unlink size={12} /> Detached copy
                </button>
              </div>
              {displayBinding === 'DETACHED' && !isSubFlow && (
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                  Config copied. Changes to original won't affect this step.
                </p>
              )}
            </div>

            <div className="mt-auto">
              <Select
                label="On Failure"
                value={activeOnFail}
                onChange={(e) => setActiveOnFail(e.target.value as OnFailStrategy)}
                options={[
                  { value: 'STOP_FLOW', label: 'Stop flow' },
                  { value: 'SKIP_AND_CONTINUE', label: 'Skip and continue' },
                ]}
              />
            </div>
          </div>

          {/* Right: picker or form */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-5">
            {isSubFlow ? (
              <FlowPicker
                flows={availableFlows}
                operations={operations}
                selected={selectedFlowId}
                onSelect={setSelectedFlowId}
              />
            ) : sourceMode === 'catalog' ? (
              <OperationPicker
                operations={operations}
                selected={selectedOperationId}
                onSelect={setSelectedOperationId}
              />
            ) : (
              <div className="flex flex-col gap-4 overflow-y-auto flex-1">
                <OperationForm
                  name={newName}
                  config={newConfig}
                  onNameChange={setNewName}
                  onConfigChange={setNewConfig}
                  onTypeChange={(type) => setNewConfig(defaultConfig(type))}
                  isNew
                />
                <div className="border-t border-[var(--color-border)]" />
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative shrink-0">
                    <input type="checkbox" className="sr-only" checked={saveToСatalog} onChange={(e) => setSaveToСatalog(e.target.checked)} />
                    <div className={cn('w-8 h-4 rounded-full transition-colors', saveToСatalog ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]')} />
                    <div className={cn('absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform', saveToСatalog && 'translate-x-4')} />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">Save to catalog</span>
                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {saveToСatalog ? 'Added to catalog and linked to this step' : 'Step only — stays private to this flow'}
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--color-border)] shrink-0">
          <Button variant="secondary" size="sm" onClick={resetAndClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitDisabled}>
            {isSubmitting ? 'Creating...' : isCreateNew ? 'Create & Add' : 'Add Step'}
          </Button>
        </div>
      </div>
    </>
  )
}
