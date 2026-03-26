import { cn } from '@/lib/cn.ts'

type Variant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'muted'

const variants: Record<Variant, string> = {
  default: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)]',
  success: 'bg-green-500/10 text-green-400',
  error: 'bg-red-500/10 text-red-400',
  warning: 'bg-yellow-500/10 text-yellow-400',
  info: 'bg-blue-500/10 text-blue-400',
  muted: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]',
}

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
