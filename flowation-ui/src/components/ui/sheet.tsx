import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

function SheetOverlay({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
        'data-[state=open]:animate-[radix-overlay-show_200ms_ease]',
        'data-[state=closed]:animate-[radix-overlay-hide_200ms_ease]',
        className,
      )}
      {...props}
    />
  )
}

const sheetSideStyles = {
  right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm data-[state=open]:animate-[radix-slide-left-fade_200ms_ease] data-[state=closed]:animate-[radix-slide-right-fade_150ms_ease]',
  left:  'inset-y-0 left-0 h-full w-3/4 max-w-sm data-[state=open]:animate-[radix-slide-right-fade_200ms_ease] data-[state=closed]:animate-[radix-slide-left-fade_150ms_ease]',
  top:    'inset-x-0 top-0 w-full data-[state=open]:animate-[radix-slide-down-fade_200ms_ease] data-[state=closed]:animate-[radix-slide-up-fade_150ms_ease]',
  bottom: 'inset-x-0 bottom-0 w-full data-[state=open]:animate-[radix-slide-up-fade_200ms_ease] data-[state=closed]:animate-[radix-slide-down-fade_150ms_ease]',
} as const

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof sheetSideStyles
  className?: string
  showClose?: boolean
}

function SheetContent({ side = 'right', className, children, showClose = true, ...props }: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col',
          'border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-xl',
          'focus:outline-none',
          sheetSideStyles[side],
          side === 'right' || side === 'left' ? 'border-l' : 'border-t',
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-6 pb-4', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold text-[var(--color-text-primary)]', className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-[var(--color-text-muted)]', className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 p-6 pt-4', className)} {...props} />
}

export { SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter }
