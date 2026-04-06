import { cn } from '@/lib/cn.ts'
import { useState, type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  content?: ReactNode
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  activeTab?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs({ tabs, defaultTab, activeTab: controlledTab, onChange, className }: TabsProps) {
  const [internalActive, setInternalActive] = useState(defaultTab ?? tabs[0]?.id ?? '')

  const isControlled = controlledTab !== undefined
  const active = isControlled ? controlledTab : internalActive

  const handleClick = (id: string) => {
    if (isControlled) {
      onChange?.(id)
    } else {
      setInternalActive(id)
    }
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleClick(tab.id)}
            className={cn(
              'px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
              active === tab.id
                ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)] -mb-px'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.some((t) => t.content) && (
        <div className="flex-1 overflow-auto">
          {tabs.find((t) => t.id === active)?.content}
        </div>
      )}
    </div>
  )
}
