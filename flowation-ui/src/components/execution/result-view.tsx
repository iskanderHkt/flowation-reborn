import { Badge } from '@/components/ui/badge.tsx'
import { Clock } from 'lucide-react'
import type { ExecutionResult } from '@/api/types.ts'
import { STATUS_BADGE } from './status-badge.tsx'
import { HttpResultView } from './http-result-view.tsx'
import { SqlResultView } from './sql-result-view.tsx'
import { AssertResultView } from './assert-result-view.tsx'

export function ResultView({ result, compact }: { result: ExecutionResult; compact: boolean }) {
  const badge = STATUS_BADGE[result.status]
  const req = result.requestSnapshot
  const res = result.responseSnapshot
  const isSql = 'query' in req && 'dbType' in req
  const isAssert = 'expression' in req && 'comparator' in req

  return (
    <div className="flex flex-col gap-3">
      {/* Status bar — only in full mode (Result tab) */}
      {!compact && (
        <div className="flex items-center gap-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] font-mono">
            <Clock size={12} />
            {result.durationMs}ms
          </span>
          <span className="text-xs text-[var(--color-text-muted)] font-mono">
            {new Date(result.startedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Error */}
      {result.errorMessage && (
        <div className="px-3 py-2 rounded-[var(--radius-md)] bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-mono">
          {result.errorMessage}
        </div>
      )}

      {isSql ? (
        <SqlResultView request={req} response={res ?? {}} />
      ) : isAssert ? (
        <AssertResultView request={req} response={res} />
      ) : (
        <HttpResultView request={req} response={res ?? {}} />
      )}
    </div>
  )
}
