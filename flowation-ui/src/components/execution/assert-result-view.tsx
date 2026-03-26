import { Badge } from '@/components/ui/badge.tsx'
import { cn } from '@/lib/cn.ts'
import { Send, ArrowDownLeft, Check, X } from 'lucide-react'

const COMPARATOR_LABELS: Record<string, string> = {
  EQ: '=',
  NEQ: '!=',
  CONTAINS: 'contains',
  REGEX: '~=',
  GT: '>',
  LT: '<',
  IS_NULL: 'is null',
}

export function AssertResultView({
  request,
  response,
}: {
  request: Record<string, unknown>
  response: Record<string, unknown> | null
}) {
  const expression = request.expression as string
  const comparator = request.comparator as string
  const expected = request.expected as string

  const actual = response?.actual as string | undefined
  const passed = response?.passed as boolean | undefined

  return (
    <div className="flex flex-col gap-3">
      {/* ── Assertion ──────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <Send size={11} className="text-[var(--color-accent)] shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Assertion</span>
        </div>

        <div className="px-3 py-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
            <span className="text-[var(--color-text-secondary)]">{expression}</span>
            <Badge variant="muted">{COMPARATOR_LABELS[comparator] ?? comparator}</Badge>
            <span className="text-[var(--color-text-secondary)]">{expected}</span>
          </div>
        </div>
      </section>

      {/* ── Result ─────────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <ArrowDownLeft size={11} className="text-green-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Result</span>
          {passed !== undefined && (
            <Badge variant={passed ? 'success' : 'error'}>
              <span className="flex items-center gap-1">
                {passed ? <Check size={10} /> : <X size={10} />}
                {passed ? 'Passed' : 'Failed'}
              </span>
            </Badge>
          )}
        </div>

        <div className="px-3 py-3">
          {actual !== undefined ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="text-[var(--color-text-muted)] shrink-0">Actual:</span>
                <span className={cn(
                  'font-mono',
                  passed ? 'text-green-400' : 'text-red-400',
                )}>
                  {actual || '(empty)'}
                </span>
              </div>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="text-[var(--color-text-muted)] shrink-0">Expected:</span>
                <span className="font-mono text-[var(--color-text-secondary)]">
                  {expected || '(empty)'}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)] italic">No result data</span>
          )}
        </div>
      </section>
    </div>
  )
}
