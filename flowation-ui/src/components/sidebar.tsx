import { useRouterState, useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/cn.ts'
import {
  Zap,
  GitBranch,
  Globe,
  Layers,
  History,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUIStore } from '@/shared/stores/ui-store.ts'

interface NavItem {
  to: string
  label: string
  icon: typeof Zap
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/flows', label: 'Flows', icon: GitBranch },
  { to: '/catalog', label: 'Catalog', icon: Zap },
  { to: '/environments', label: 'Environments', icon: Globe },
  { to: '/batch', label: 'Batch', icon: Layers },
  { to: '/executions', label: 'Executions', icon: History },
  { to: '/schedules', label: 'Schedules', icon: CalendarClock },
]

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed)
  const routerState = useRouterState()
  const navigate = useNavigate()
  const currentPath = routerState.location.pathname

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200',
        collapsed ? 'w-14' : 'w-52',
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-12 border-b border-[var(--color-border)]">
        <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shrink-0">
          <Zap size={14} className="text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
            Flowation
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = currentPath.startsWith(item.to)
          const Icon = item.icon
          return (
            <a
              key={item.to}
              href={item.to}
              onClick={(e) => {
                e.preventDefault()
                if (!item.disabled) navigate({ to: item.to as '/' })
              }}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-sm transition-colors',
                active
                  ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]',
                item.disabled && 'opacity-40 pointer-events-none',
              )}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </a>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  )
}
