import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn.ts'

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type ToastVariant = 'success' | 'error' | 'info'

interface ToastPayload {
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastEntry extends ToastPayload {
  id: number
}

interface ToastContextValue {
  toast: (payload: ToastPayload) => void
}

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MAX_TOASTS = 5
const DEFAULT_DURATION = 4_000

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-l-green-400',
  error: 'border-l-red-400',
  info: 'border-l-[var(--color-accent)]',
}

const iconByVariant: Record<ToastVariant, ReactNode> = {
  success: (
    <svg
      className="size-5 shrink-0 text-green-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg
      className="size-5 shrink-0 text-red-400"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: (
    <svg
      className="size-5 shrink-0 text-[var(--color-accent)]"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

/* ------------------------------------------------------------------ */
/*  Single toast                                                      */
/* ------------------------------------------------------------------ */

function ToastItem({
  entry,
  onClose,
  duration = DEFAULT_DURATION,
}: {
  entry: ToastEntry
  onClose: (id: number) => void
  duration?: number
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(() => onClose(entry.id), duration)
    return () => clearTimeout(timerRef.current)
  }, [duration, entry.id, onClose])

  const variant = entry.variant ?? 'info'

  return (
    <motion.div
      initial={{ opacity: 0, x: 24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className={cn(
        'pointer-events-auto flex w-80 items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3 shadow-lg border-l-4',
        variantStyles[variant],
      )}
      role="alert"
    >
      {iconByVariant[variant]}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          {entry.title}
        </p>
        {entry.description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
            {entry.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onClose(entry.id)}
        className="shrink-0 rounded-[var(--radius-sm)] p-0.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
        aria-label="Close"
      >
        <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */

export function ToastProvider({
  children,
  duration = DEFAULT_DURATION,
}: {
  children: ReactNode
  duration?: number
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (payload: ToastPayload) => {
      setToasts((prev) => {
        const entry: ToastEntry = { ...payload, id: nextId.current++ }
        const next = [...prev, entry]
        // Keep only the latest MAX_TOASTS
        return next.slice(-MAX_TOASTS)
      })
    },
    [],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom-right, stacked */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((entry) => (
            <ToastItem
              key={entry.id}
              entry={entry}
              onClose={dismiss}
              duration={duration}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
