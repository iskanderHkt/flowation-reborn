import { useState } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { ExecutionResult } from '@/api/types.ts'
import { STATUS_BADGE } from './status-badge.tsx'
import { MethodBadge, HttpStatusBadge } from './http-result-view.tsx'
import { ResultView } from './result-view.tsx'

export function HistoryList({ history }: { history: ExecutionResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-1">
      {history.map((r) => {
        const badge = STATUS_BADGE[r.status]
        const isOpen = expanded === r.runId
        const isSql = 'query' in r.requestSnapshot
        const method = r.requestSnapshot.method as string | undefined
        const status = r.responseSnapshot?.status as number | undefined

        return (
          <div
            key={r.runId}
            className="border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden"
          >
            <button
              onClick={() => setExpanded(isOpen ? null : r.runId)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--color-bg-elevated)] transition-colors cursor-pointer"
            >
              {isOpen ? (
                <ChevronDown size={12} className="text-[var(--color-text-muted)] shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-[var(--color-text-muted)] shrink-0" />
              )}
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {method && <MethodBadge method={method} />}
              {status !== undefined && <HttpStatusBadge status={status} />}
              {isSql && <Badge variant="info">SQL</Badge>}
              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                {r.durationMs}ms
              </span>
              <span className="text-xs text-[var(--color-text-muted)] ml-auto font-mono">
                {new Date(r.startedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </button>
            {isOpen && (
              <div className="px-3 py-3 border-t border-[var(--color-border-subtle)]">
                <ResultView result={r} compact />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
