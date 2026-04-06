import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Variable, Table2, Hash, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { cn } from '@/lib/cn.ts'

interface ResponseVariablePickerProps {
  responseSnapshot: Record<string, unknown> | null
  onExtract: (sourcePath: string, suggestedName: string) => void
}

export function ResponseVariablePickerPanel({ responseSnapshot, onExtract }: ResponseVariablePickerProps) {
  if (!responseSnapshot) {
    return (
      <div className="text-[11px] text-[var(--color-text-muted)] py-4 text-center">
        Run the step to see response and extract variables
      </div>
    )
  }

  // Detect SQL response (has rows array)
  const isSql = Array.isArray(responseSnapshot.rows)

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Variable size={12} className="text-[var(--color-accent)]" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          Extract Variables
        </span>
      </div>

      {isSql ? (
        <SqlResponsePicker response={responseSnapshot} onExtract={onExtract} />
      ) : (
        <JsonTreePicker data={responseSnapshot} path="$" onExtract={onExtract} />
      )}
    </div>
  )
}

/* ── SQL Response Picker ────────────────────────────── */

function SqlResponsePicker({
  response,
  onExtract,
}: {
  response: Record<string, unknown>
  onExtract: (sourcePath: string, suggestedName: string) => void
}) {
  const rows = (response.rows ?? []) as Record<string, unknown>[]
  const rowCount = response.rowCount as number | undefined

  return (
    <div className="flex flex-col gap-2">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-1.5">
        {rowCount != null && (
          <button
            onClick={() => onExtract('$.rowCount', 'row_count')}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <Hash size={10} />
            Row count ({rowCount})
          </button>
        )}
        {rows.length > 0 && (
          <button
            onClick={() => {
              const firstRow = rows[0]
              Object.keys(firstRow).forEach((col) => {
                onExtract(`$.rows[0].${col}`, col)
              })
            }}
            className="flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors cursor-pointer"
          >
            <Table2 size={10} />
            First row → variables
          </button>
        )}
      </div>

      {/* Table preview */}
      {rows.length > 0 && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden max-h-[160px] overflow-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-[var(--color-bg-elevated)]">
                {Object.keys(rows[0]).map((col) => (
                  <th
                    key={col}
                    className="px-2 py-1 text-left font-medium text-[var(--color-text-muted)] border-b border-[var(--color-border-subtle)]"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                  {Object.entries(row).map(([col, val]) => (
                    <td
                      key={col}
                      onClick={() => onExtract(`$.rows[${i}].${col}`, `${col}_${i}`)}
                      className="px-2 py-1 font-mono text-[var(--color-text-primary)] cursor-pointer hover:bg-[var(--color-accent-subtle)] hover:text-[var(--color-accent)] transition-colors truncate max-w-[100px]"
                      title={`Click to extract $.rows[${i}].${col}`}
                    >
                      {String(val ?? 'null')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && (
            <div className="px-2 py-1 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-bg-elevated)] border-t border-[var(--color-border-subtle)]">
              +{rows.length - 5} more rows
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── JSON Tree Picker ───────────────────────────────── */

function JsonTreePicker({
  data,
  path,
  onExtract,
  depth = 0,
}: {
  data: unknown
  path: string
  onExtract: (sourcePath: string, suggestedName: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (data === null || data === undefined) {
    return (
      <PickableValue path={path} value="null" onExtract={onExtract} />
    )
  }

  if (typeof data !== 'object') {
    return (
      <PickableValue path={path} value={String(data)} onExtract={onExtract} />
    )
  }

  if (Array.isArray(data)) {
    return (
      <div className="ml-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span className="font-mono">[{data.length}]</span>
        </button>
        {expanded && data.slice(0, 10).map((item, i) => (
          <div key={i} className="ml-2 flex items-start gap-1">
            <span className="text-[10px] font-mono text-[var(--color-text-muted)] shrink-0 mt-0.5">{i}:</span>
            <JsonTreePicker data={item} path={`${path}[${i}]`} onExtract={onExtract} depth={depth + 1} />
          </div>
        ))}
      </div>
    )
  }

  const entries = Object.entries(data as Record<string, unknown>)

  return (
    <div className={cn(depth > 0 && 'ml-2')}>
      {depth > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)]"
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span className="font-mono">{`{${entries.length}}`}</span>
        </button>
      )}
      {(depth === 0 || expanded) && entries.map(([key, val]) => (
        <div key={key} className="flex items-start gap-1 ml-2">
          <span className="text-[10px] font-mono text-[var(--color-info)] shrink-0 mt-0.5">{key}:</span>
          {typeof val === 'object' && val !== null ? (
            <JsonTreePicker data={val} path={`${path}.${key}`} onExtract={onExtract} depth={depth + 1} />
          ) : (
            <PickableValue path={`${path}.${key}`} value={String(val ?? 'null')} onExtract={onExtract} />
          )}
        </div>
      ))}
    </div>
  )
}

function PickableValue({
  path,
  value,
  onExtract,
}: {
  path: string
  value: string
  onExtract: (sourcePath: string, suggestedName: string) => void
}) {
  // Generate suggested variable name from path: $.body.token → body_token
  const suggestedName = path
    .replace(/^\$\.?/, '')
    .replace(/\[(\d+)\]/g, '_$1')
    .replace(/\./g, '_')
    .toLowerCase()

  return (
    <span
      onClick={() => onExtract(path, suggestedName)}
      className="text-[10px] font-mono text-[var(--color-text-primary)] cursor-pointer hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] px-0.5 rounded-[2px] transition-colors truncate max-w-[180px] inline-block"
      title={`Click to extract as variable: ${path}`}
    >
      {value.length > 40 ? value.substring(0, 40) + '...' : value}
      <Plus size={8} className="inline ml-0.5 opacity-0 group-hover:opacity-100" />
    </span>
  )
}
