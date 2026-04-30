import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn.ts'

interface HistoryPaginationProps {
  page: number
  total: number
  size: number
  onChange: (page: number) => void
  className?: string
}

export function HistoryPagination({ page, total, size, onChange, className }: HistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (total <= size) return null

  const from = page * size + 1
  const to = Math.min((page + 1) * size, total)

  return (
    <div className={cn('flex items-center justify-between px-3 py-2 border-t border-[var(--color-border-subtle)]', className)}>
      <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className={cn(
            'p-1 rounded-[var(--radius-sm)] transition-colors',
            page === 0 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
          )}
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-[10px] text-[var(--color-text-muted)] px-1">
          {page + 1} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          className={cn(
            'p-1 rounded-[var(--radius-sm)] transition-colors',
            page >= totalPages - 1 ? 'opacity-30 cursor-default' : 'hover:bg-[var(--color-bg-elevated)] cursor-pointer',
          )}
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}
