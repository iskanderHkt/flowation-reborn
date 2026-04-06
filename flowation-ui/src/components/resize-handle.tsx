import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn.ts'

interface ResizeHandleProps {
  direction?: 'vertical' | 'horizontal'
  size: number
  onResize: (size: number) => void
  min?: number
  max?: number
}

export function ResizeHandle({
  direction = 'vertical',
  size,
  onResize,
  min = 120,
  max = 600,
}: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startPos.current = direction === 'vertical' ? e.clientY : e.clientX
      startSize.current = size
      setDragging(true)
    },
    [size, direction],
  )

  useEffect(() => {
    if (!dragging) return

    const onMouseMove = (e: MouseEvent) => {
      const pos = direction === 'vertical' ? e.clientY : e.clientX
      // vertical: drag up = larger (startPos - pos > 0)
      // horizontal: drag left = wider (startPos - pos > 0)
      const delta = startPos.current - pos
      const next = Math.min(max, Math.max(min, startSize.current + delta))
      onResize(next)
    }

    const onMouseUp = () => setDragging(false)

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, min, max, onResize, direction])

  const isVertical = direction === 'vertical'

  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'flex items-center justify-center group shrink-0 relative',
        isVertical ? 'h-1.5 cursor-row-resize' : 'w-1.5 cursor-col-resize',
        dragging && 'bg-[var(--color-accent-subtle)]',
      )}
    >
      <div
        className={cn(
          'rounded-full transition-colors',
          isVertical ? 'w-12 h-0.5' : 'w-0.5 h-12',
          dragging
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-border)] group-hover:bg-[var(--color-accent-muted)]',
        )}
      />
      <div className={cn('absolute', isVertical ? 'inset-x-0 -top-1 -bottom-1' : 'inset-y-0 -left-1 -right-1')} />
    </div>
  )
}
