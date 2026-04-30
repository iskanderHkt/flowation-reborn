import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/cn.ts'

interface KeyValuePair {
  key: string
  value: string
}

interface KeyValueEditorProps {
  pairs: KeyValuePair[]
  onChange: (pairs: KeyValuePair[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  className?: string
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  className,
}: KeyValueEditorProps) {
  const update = (index: number, field: 'key' | 'value', val: string) => {
    const next = pairs.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    onChange(next)
  }

  const remove = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index))
  }

  const add = () => {
    onChange([...pairs, { key: '', value: '' }])
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/* Header row */}
      {pairs.length > 0 && (
        <div className="flex gap-2 px-0.5">
          <span className="flex-1 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            Key
          </span>
          <span className="flex-1 text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            Value
          </span>
          <span className="w-7" />
        </div>
      )}

      {/* Rows */}
      {pairs.map((pair, i) => (
        <div key={i} className="flex gap-2 items-center group">
          <input
            value={pair.key}
            onChange={(e) => update(i, 'key', e.target.value)}
            placeholder={keyPlaceholder}
            className="flex-1 h-7 px-2 text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
          <input
            value={pair.value}
            onChange={(e) => update(i, 'value', e.target.value)}
            placeholder={valuePlaceholder}
            className="flex-1 h-7 px-2 text-xs font-mono rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-colors"
          />
          <button
            onClick={() => remove(i)}
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        onClick={add}
        className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors cursor-pointer py-1 self-start"
      >
        <Plus size={12} />
        Add header
      </button>
    </div>
  )
}

/* ─── Helpers to convert between Record and pairs ─── */

export function recordToPairs(record: Record<string, string> | null | undefined): KeyValuePair[] {
  if (!record) return []
  const entries = Object.entries(record)
  return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : []
}

export function pairsToRecord(pairs: KeyValuePair[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const { key, value } of pairs) {
    if (key.trim()) {
      record[key.trim()] = value
    }
  }
  return record
}
