import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge.tsx'
import { CodeEditor } from '@/components/code-editor.tsx'
import { cn } from '@/lib/cn.ts'
import { Send, ArrowDownLeft } from 'lucide-react'
import { Collapsible } from './collapsible.tsx'

/* ─── Method badge ──────────────────────────────────── */

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
  HEAD: 'text-purple-400',
  OPTIONS: 'text-[var(--color-text-muted)]',
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        'text-[11px] font-bold font-mono tracking-wide',
        METHOD_COLORS[method] ?? 'text-[var(--color-text-secondary)]',
      )}
    >
      {method}
    </span>
  )
}

/* ─── HTTP status badge ─────────────────────────────── */

export function HttpStatusBadge({ status }: { status: number }) {
  let variant: 'success' | 'error' | 'warning' | 'info' = 'info'
  if (status >= 200 && status < 300) variant = 'success'
  else if (status >= 400 && status < 500) variant = 'warning'
  else if (status >= 500) variant = 'error'

  return <Badge variant={variant}>{status}</Badge>
}

/* ─── Request headers table (flat) ──────────────────── */

export function HeadersTable({ headers }: { headers: Record<string, string> }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border-subtle)]">
      {Object.entries(headers).map(([key, value], i, arr) => (
        <div
          key={key}
          className={cn(
            'flex text-xs font-mono',
            i < arr.length - 1 && 'border-b border-[var(--color-border-subtle)]',
          )}
        >
          <span className="px-2.5 py-1 font-medium text-[var(--color-accent)] bg-[var(--color-bg-tertiary)] min-w-[140px] shrink-0 border-r border-[var(--color-border-subtle)]">
            {key}
          </span>
          <span className="px-2.5 py-1 text-[var(--color-text-secondary)] truncate">{value}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Response headers table (values are arrays) ────── */

export function ResponseHeadersTable({ headers }: { headers: Record<string, string[]> }) {
  return (
    <div className="flex flex-col rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border-subtle)]">
      {Object.entries(headers).map(([key, values], i, arr) => (
        <div
          key={key}
          className={cn(
            'flex text-xs font-mono',
            i < arr.length - 1 && 'border-b border-[var(--color-border-subtle)]',
          )}
        >
          <span className="px-2.5 py-1 font-medium text-[var(--color-accent)] bg-[var(--color-bg-tertiary)] min-w-[140px] shrink-0 border-r border-[var(--color-border-subtle)]">
            {key}
          </span>
          <span className="px-2.5 py-1 text-[var(--color-text-secondary)] truncate">
            {values.join(', ')}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── HTTP Result View ──────────────────────────────── */

export function HttpResultView({
  request,
  response,
}: {
  request: Record<string, unknown>
  response: Record<string, unknown>
}) {
  const method = request.method as string
  const url = request.url as string
  const reqHeaders = request.headers as Record<string, string> | undefined
  const reqBody = request.body as string | undefined
  const hasReqHeaders = reqHeaders && Object.keys(reqHeaders).length > 0
  const hasReqBody = reqBody && reqBody.trim()

  const status = response.status as number | undefined
  const resHeaders = response.headers as Record<string, string[]> | undefined
  const resBody = response.body
  const hasResHeaders = resHeaders && Object.keys(resHeaders).length > 0

  const formattedResBody = useMemo(() => {
    if (resBody == null) return null
    if (typeof resBody === 'string') return resBody
    return JSON.stringify(resBody, null, 2)
  }, [resBody])

  const formattedReqBody = useMemo(() => {
    if (!reqBody || !reqBody.trim()) return null
    try {
      return JSON.stringify(JSON.parse(reqBody), null, 2)
    } catch {
      return reqBody
    }
  }, [reqBody])

  return (
    <div className="flex flex-col gap-3">
      {/* ── Request ──────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <Send size={11} className="text-[var(--color-accent)] shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Request</span>
          <MethodBadge method={method} />
          <span className="text-xs font-mono text-[var(--color-text-secondary)] truncate">
            {url}
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
          {hasReqHeaders && (
            <Collapsible title="Headers" defaultOpen={false} padded>
              <HeadersTable headers={reqHeaders} />
            </Collapsible>
          )}
          {hasReqBody && formattedReqBody && (
            <Collapsible title="Body" defaultOpen padded>
              <CodeEditor
                value={formattedReqBody}
                language="json"
                readOnly
                minHeight="40px"
              />
            </Collapsible>
          )}
          {!hasReqHeaders && !hasReqBody && (
            <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] italic">No headers or body</div>
          )}
        </div>
      </section>

      {/* ── Response ─────────────────────────────────── */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-3 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border-subtle)]">
          <ArrowDownLeft size={11} className="text-green-400 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Response</span>
          {status !== undefined && <HttpStatusBadge status={status} />}
        </div>

        <div className="flex flex-col divide-y divide-[var(--color-border-subtle)]">
          {hasResHeaders && (
            <Collapsible title="Headers" defaultOpen={false} padded>
              <ResponseHeadersTable headers={resHeaders} />
            </Collapsible>
          )}
          {formattedResBody != null && (
            <Collapsible title="Body" defaultOpen padded>
              <CodeEditor
                value={formattedResBody}
                language="json"
                readOnly
                minHeight="40px"
              />
            </Collapsible>
          )}
        </div>
      </section>
    </div>
  )
}
