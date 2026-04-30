import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input.tsx'
import { Select } from '@/components/ui/select.tsx'
import { CodeEditor } from '@/components/code-editor.tsx'
import { KeyValueEditor, recordToPairs, pairsToRecord } from '@/components/key-value-editor.tsx'
import type { OperationConfig, OperationType, OperationGroup } from '@/api/types.ts'

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
  (m) => ({ value: m, label: m }),
)

const DB_TYPES = [
  { value: 'POSTGRES', label: 'PostgreSQL' },
  { value: 'MYSQL', label: 'MySQL' },
]

const COMPARATORS = [
  { value: 'EQ', label: '= Equals' },
  { value: 'NEQ', label: '!= Not Equals' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'REGEX', label: 'Regex' },
  { value: 'GT', label: '> Greater Than' },
  { value: 'LT', label: '< Less Than' },
  { value: 'IS_NULL', label: 'Is Null' },
  { value: 'IS_NOT_NULL', label: 'Is Not Null' },
]

const UNARY_COMPARATORS = new Set(['IS_NULL', 'IS_NOT_NULL'])

const OP_TYPES: { value: OperationType; label: string }[] = [
  { value: 'HTTP_REQUEST', label: 'HTTP Request' },
  { value: 'SQL_QUERY', label: 'SQL Query' },
  { value: 'ASSERTION', label: 'Assertion' },
]

function defaultConfig(type: OperationType): OperationConfig {
  switch (type) {
    case 'HTTP_REQUEST':
      return { type: 'HTTP_REQUEST', method: 'GET', url: '', headers: {}, body: '', timeoutMs: 5000, failOnHttpError: false }
    case 'SQL_QUERY':
      return { type: 'SQL_QUERY', dbType: 'POSTGRES', connectionString: '', query: '' }
    case 'ASSERTION':
      return { type: 'ASSERTION', expression: '', comparator: 'EQ', expected: '' }
  }
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-[11px] text-red-400 mt-1">{error}</p>
}

interface OperationFormProps {
  name: string
  config: OperationConfig
  onNameChange: (name: string) => void
  onConfigChange: (config: OperationConfig) => void
  onTypeChange?: (type: OperationType) => void
  groupId?: string | null
  onGroupIdChange?: (id: string | null) => void
  groups?: OperationGroup[]
  isNew?: boolean
  hideName?: boolean
  validationErrors?: Record<string, string> | null
}

export function OperationForm({
  name,
  config,
  onNameChange,
  onConfigChange,
  onTypeChange,
  groupId,
  onGroupIdChange,
  groups,
  isNew = false,
  hideName = false,
  validationErrors,
}: OperationFormProps) {
  const handleTypeSwitch = (type: OperationType) => {
    onConfigChange(defaultConfig(type))
    onTypeChange?.(type)
  }

  return (
    <div className="flex flex-col gap-4">
      {!hideName && (
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="Name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Login Request"
            />
            <FieldError error={validationErrors?.['name']} />
          </div>
          {groups !== undefined && onGroupIdChange && (
            <div className="w-44">
              <Select
                label="Group"
                value={groupId ?? ''}
                options={[
                  { value: '', label: '— No group —' },
                  ...groups.map((g) => ({ value: g.id, label: g.name })),
                ]}
                onChange={(e) => onGroupIdChange(e.target.value || null)}
              />
            </div>
          )}
          {isNew && (
            <div className="w-44">
              <Select
                label="Type"
                value={config.type}
                options={OP_TYPES}
                onChange={(e) => handleTypeSwitch(e.target.value as OperationType)}
              />
            </div>
          )}
        </div>
      )}

      {config.type === 'HTTP_REQUEST' && (
        <HttpConfigForm config={config} onChange={onConfigChange} errors={validationErrors} />
      )}
      {config.type === 'SQL_QUERY' && (
        <SqlConfigForm config={config} onChange={onConfigChange} errors={validationErrors} />
      )}
      {config.type === 'ASSERTION' && (
        <AssertConfigForm config={config} onChange={onConfigChange} errors={validationErrors} />
      )}
    </div>
  )
}

/* ─── HTTP ──────────────────────────────────────────── */

function HttpConfigForm({
  config,
  onChange,
  errors,
}: {
  config: Extract<OperationConfig, { type: 'HTTP_REQUEST' }>
  onChange: (c: OperationConfig) => void
  errors?: Record<string, string> | null
}) {
  const set = (patch: Partial<typeof config>) =>
    onChange({ ...config, ...patch })

  // Local state for header pairs so empty-key rows can exist
  const [headerPairs, setHeaderPairs] = useState(() => recordToPairs(config.headers))
  const internalEdit = useRef(false)

  // Sync from config only when changed externally (e.g. after save)
  useEffect(() => {
    if (internalEdit.current) {
      internalEdit.current = false
      return
    }
    setHeaderPairs(recordToPairs(config.headers))
  }, [config.headers])

  const handleHeadersChange = (pairs: { key: string; value: string }[]) => {
    internalEdit.current = true
    setHeaderPairs(pairs)
    set({ headers: pairsToRecord(pairs) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-end">
        <div className="w-32">
          <Select
            label="Method"
            value={config.method}
            options={HTTP_METHODS}
            onChange={(e) => set({ method: e.target.value })}
          />
        </div>
        <div className="flex-1">
          <Input
            label="URL"
            value={config.url}
            onChange={(e) => set({ url: e.target.value })}
            placeholder="https://api.example.com/endpoint or {{base_url}}/path"
            className="font-mono text-xs"
          />
          <FieldError error={errors?.['config.url']} />
        </div>
        <div className="w-24">
          <Input
            label="Timeout (ms)"
            type="number"
            value={config.timeoutMs ?? 5000}
            onChange={(e) => set({ timeoutMs: Number(e.target.value) })}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer self-start">
        <input
          type="checkbox"
          checked={config.failOnHttpError ?? false}
          onChange={(e) => set({ failOnHttpError: e.target.checked })}
          className="w-3.5 h-3.5 rounded accent-[var(--color-accent)] cursor-pointer"
        />
        <span className="text-xs text-[var(--color-text-secondary)]">
          Fail step on 4xx / 5xx response
        </span>
      </label>

      <div>
        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
          Headers
        </label>
        <KeyValueEditor
          pairs={headerPairs}
          onChange={handleHeadersChange}
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
          Body
        </label>
        <CodeEditor
          value={config.body ?? ''}
          onChange={(val) => set({ body: val })}
          language="json"
          placeholder='{ "email": "{{user_email}}" }'
          minHeight="100px"
        />
      </div>
    </div>
  )
}

/* ─── SQL ───────────────────────────────────────────── */

function SqlConfigForm({
  config,
  onChange,
  errors,
}: {
  config: Extract<OperationConfig, { type: 'SQL_QUERY' }>
  onChange: (c: OperationConfig) => void
  errors?: Record<string, string> | null
}) {
  const set = (patch: Partial<typeof config>) =>
    onChange({ ...config, ...patch })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 items-end">
        <div className="w-40">
          <Select
            label="Database"
            value={config.dbType}
            options={DB_TYPES}
            onChange={(e) => set({ dbType: e.target.value as 'POSTGRES' | 'MYSQL' })}
          />
        </div>
        <div className="flex-1">
          <Input
            label="Connection String"
            value={config.connectionString}
            onChange={(e) => set({ connectionString: e.target.value })}
            placeholder="jdbc:postgresql://localhost:5432/db"
            className="font-mono text-xs"
          />
          <FieldError error={errors?.['config.connectionString']} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1.5 block">
          SQL Query
        </label>
        <CodeEditor
          value={config.query}
          onChange={(val) => set({ query: val })}
          language="sql"
          placeholder="SELECT * FROM users WHERE id = {{user_id}}"
          minHeight="120px"
        />
        <FieldError error={errors?.['config.query']} />
      </div>
    </div>
  )
}

/* ─── Assert ────────────────────────────────────────── */

function AssertConfigForm({
  config,
  onChange,
  errors,
}: {
  config: Extract<OperationConfig, { type: 'ASSERTION' }>
  onChange: (c: OperationConfig) => void
  errors?: Record<string, string> | null
}) {
  const set = (patch: Partial<typeof config>) =>
    onChange({ ...config, ...patch })

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Input
          label="Expression"
          value={config.expression}
          onChange={(e) => set({ expression: e.target.value })}
          placeholder="{{response.status}}"
          className="font-mono text-xs"
        />
        <FieldError error={errors?.['config.expression']} />
      </div>
      <div className="flex gap-3 items-end">
        <div className="w-48">
          <Select
            label="Comparator"
            value={config.comparator}
            options={COMPARATORS}
            onChange={(e) => set({ comparator: e.target.value as typeof config.comparator })}
          />
        </div>
        {!UNARY_COMPARATORS.has(config.comparator) && (
          <div className="flex-1">
            <Input
              label="Expected"
              value={config.expected}
              onChange={(e) => set({ expected: e.target.value })}
              placeholder="200"
              className="font-mono text-xs"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export { defaultConfig }
