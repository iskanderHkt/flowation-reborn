import { useState } from 'react'
import { cn } from '@/lib/cn.ts'
import { ChevronDown, ChevronRight } from 'lucide-react'

export function Collapsible({
  title,
  defaultOpen = false,
  padded = false,
  children,
}: {
  title: React.ReactNode
  defaultOpen?: boolean
  padded?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer',
          padded ? 'px-3 py-2 hover:bg-[var(--color-bg-hover)]' : 'py-1',
        )}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {title}
      </button>
      {open && <div className={padded ? 'px-3 pb-3 pt-1' : 'mt-1'}>{children}</div>}
    </div>
  )
}
