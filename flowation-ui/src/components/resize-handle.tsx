import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn.ts'

interface ResizeHandleProps {
  panelHeight: number
  onResize: (height: number) => void
  minHeight?: number
  maxHeight?: number
}

export function ResizeHandle({
  panelHeight,
  onResize,
  minHeight = 120,
  maxHeight = 600,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startY.current = e.clientY
      startHeight.current = panelHeight
      setDragging(true)
    },
    [panelHeight],
  )

  useEffect(() => {
    if (!dragging) return

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY.current - e.clientY
      const next = Math.min(maxHeight, Math.max(minHeight, startHeight.current + delta))
      onResize(next)
    }

    const onMouseUp = () => setDragging(false)

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, minHeight, maxHeight, onResize])

  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'h-1.5 cursor-row-resize flex items-center justify-center group shrink-0 relative',
        dragging && 'bg-[var(--color-accent-subtle)]',
      )}
    >
      {/* Visual handle bar */}
      <div
        className={cn(
          'w-12 h-0.5 rounded-full transition-colors',
          dragging
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-border)] group-hover:bg-[var(--color-accent-muted)]',
        )}
      />
      {/* Wider invisible hit area */}
      <div className="absolute inset-x-0 -top-1 -bottom-1" />
    </div>
  )
}
