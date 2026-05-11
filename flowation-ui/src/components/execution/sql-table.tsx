import { useState, useMemo } from 'react'
import { cn } from '@/lib/cn.ts'
import { ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react'

type SortDir = 'asc' | 'desc' | null

export function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

export function SqlTable({ rows }: { rows: Record<string, unknown>[] }) {
  const columns = rows.length ? Object.keys(rows[0]) : []
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

  if (!rows.length) return null

  const handleSort = (col: string) => {
    if (sortCol !== col) {
      setSortCol(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortCol(null)
      setSortDir(null)
    }
  }

  const handleFilterChange = (col: string, value: string) => {
    setFilters((prev) => ({ ...prev, [col]: value }))
  }

  const processed = useMemo(() => {
    let result = [...rows]

    // Filter
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim())
    if (activeFilters.length > 0) {
      result = result.filter((row) =>
        activeFilters.every(([col, filterVal]) => {
          const cellVal = formatCellValue(row[col]).toLowerCase()
          return cellVal.includes(filterVal.toLowerCase())
        }),
      )
    }

    // Sort
    if (sortCol && sortDir) {
      result.sort((a, b) => {
        const aVal = a[sortCol]
        const bVal = b[sortCol]
        if (aVal == null && bVal == null) return 0
        if (aVal == null) return 1
        if (bVal == null) return -1

        let cmp: number
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal
        } else {
          cmp = String(aVal).localeCompare(String(bVal))
        }
        return sortDir === 'desc' ? -cmp : cmp
      })
    }

    return result
  }, [rows, filters, sortCol, sortDir])

  const activeFilterCount = Object.values(filters).filter((v) => v.trim()).length

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[var(--radius-sm)] transition-colors cursor-pointer',
            showFilters || activeFilterCount > 0
              ? 'text-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
          )}
        >
          <Filter size={10} />
          Filter
          {activeFilterCount > 0 && (
            <span className="ml-0.5 bg-[var(--color-accent)] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px]">
              {activeFilterCount}
            </span>
          )}
        </button>
        <span className="text-[10px] text-[var(--color-text-muted)] font-mono ml-auto">
          {processed.length === rows.length
            ? `${rows.length} row${rows.length !== 1 ? 's' : ''}`
            : `${processed.length} of ${rows.length} rows`}
        </span>
      </div>

      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          {/* Column headers */}
          <tr className="bg-[var(--color-bg-tertiary)]">
            <th className="px-2.5 py-1.5 text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-r border-[var(--color-border)] w-10 text-center">
              #
            </th>
            {columns.map((col) => {
              const isActive = sortCol === col
              return (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-1.5 text-left text-[10px] font-semibold text-[var(--color-accent)] uppercase tracking-wider border-b border-r border-[var(--color-border)] last:border-r-0 cursor-pointer hover:bg-[var(--color-bg-hover)] transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    {col}
                    {isActive && sortDir === 'asc' && <ArrowUp size={10} />}
                    {isActive && sortDir === 'desc' && <ArrowDown size={10} />}
                    {!isActive && <ArrowUpDown size={9} className="opacity-30" />}
                  </span>
                </th>
              )
            })}
          </tr>

          {/* Filter row */}
          {showFilters && (
            <tr className="bg-[var(--color-bg-elevated)]">
              <td className="px-1 py-1 border-b border-r border-[var(--color-border)]" />
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-1 py-1 border-b border-r border-[var(--color-border)] last:border-r-0"
                >
                  <input
                    value={filters[col] ?? ''}
                    onChange={(e) => handleFilterChange(col, e.target.value)}
                    placeholder="Filter..."
                    className="w-full h-5 px-1.5 text-[10px] font-mono rounded-[2px] bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                </td>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {processed.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="px-3 py-4 text-center text-[var(--color-text-muted)] italic border-b border-[var(--color-border-subtle)]"
              >
                No rows match the filter
              </td>
            </tr>
          ) : (
            processed.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'hover:bg-[var(--color-bg-hover)] transition-colors',
                  i % 2 === 0 ? 'bg-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-primary)]',
                )}
              >
                <td className="px-2.5 py-1.5 text-center text-[var(--color-text-muted)] border-b border-r border-[var(--color-border-subtle)]">
                  {i + 1}
                </td>
                {columns.map((col) => {
                  const val = row[col]
                  const isNull = val === null || val === undefined
                  return (
                    <td
                      key={col}
                      className={cn(
                        'px-3 py-1.5 border-b border-r border-[var(--color-border-subtle)] last:border-r-0 max-w-xs truncate',
                        isNull ? 'text-[var(--color-text-muted)] italic' : 'text-[var(--color-text-secondary)]',
                      )}
                    >
                      {isNull ? 'NULL' : formatCellValue(val)}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
