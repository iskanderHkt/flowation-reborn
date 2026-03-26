import { Badge } from '@/components/ui/badge.tsx'
import { CodeEditor } from '@/components/code-editor.tsx'
import { Send, ArrowDownLeft } from 'lucide-react'
import { SqlTable } from './sql-table.tsx'

export function SqlResultView({
  request,
  response,
}: {
  request: Record<string, unknown>
  response: Record<string, unknown>
}) {
  const dbType = request.dbType as string
  const query = request.query as string
  const rows = response.rows as Record<string, unknown>[] | undefined
  const rowCount = response.rowCount as number | undefined
  const affectedRows = response.affectedRows as number | undefined

  return (
    <div className="flex flex-col gap-3">
      {/* ── Query ────────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <Send size={11} className="text-[var(--color-accent)] shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Query</span>
          <Badge variant="info">{dbType}</Badge>
        </div>
        <div className="p-1">
          <CodeEditor
            value={query}
            language="sql"
            readOnly
            minHeight="36px"
          />
        </div>
      </section>

      {/* ── Result ───────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <ArrowDownLeft size={11} className="text-green-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Result</span>
          {rowCount !== undefined && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {rowCount} row{rowCount !== 1 ? 's' : ''}
            </span>
          )}
          {affectedRows !== undefined && (
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {affectedRows} row{affectedRows !== 1 ? 's' : ''} affected
            </span>
          )}
        </div>

        {rows && rows.length > 0 ? (
          <div className="overflow-auto">
            <SqlTable rows={rows} />
          </div>
        ) : affectedRows !== undefined ? (
          <div className="text-xs text-[var(--color-text-muted)] px-3 py-3">
            {affectedRows} row{affectedRows !== 1 ? 's' : ''} affected
          </div>
        ) : (
          <div className="text-xs text-[var(--color-text-muted)] italic px-3 py-3">
            No rows returned
          </div>
        )}
      </section>
    </div>
  )
}
