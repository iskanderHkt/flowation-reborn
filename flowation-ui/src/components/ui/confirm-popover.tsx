import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn.ts'

interface ConfirmPopoverProps {
  onConfirm: () => void
  message?: string
  confirmLabel?: string
  children: React.ReactNode
  className?: string
}

export function ConfirmPopover({
  onConfirm,
  message = 'Delete?',
  confirmLabel = 'Delete',
  children,
  className,
}: ConfirmPopoverProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Position above the trigger, aligned to right edge
    setPos({
      top: rect.top - 4,
      left: rect.right,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [open, updatePos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={triggerRef} className={cn('inline-flex', className)}>
      <div onClick={() => setOpen(true)}>{children}</div>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[100]"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-100%, -100%)',
          }}
        >
          <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg px-3 py-2.5 flex flex-col gap-2 min-w-[140px]">
            <span className="text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
              {message}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-6 px-2 text-[11px] rounded-[var(--radius-sm)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  onConfirm()
                }}
                className="flex-1 h-6 px-2 text-[11px] rounded-[var(--radius-sm)] bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer font-medium"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
