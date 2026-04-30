import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/cn'

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 w-72 rounded-[var(--radius-md)] border border-[var(--color-border)]',
          'bg-[var(--color-bg-elevated)] p-4 shadow-lg',
          'outline-none',
          'data-[state=open]:animate-[radix-slide-up-fade_150ms_ease]',
          'data-[state=closed]:animate-[radix-slide-down-fade_100ms_ease]',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { PopoverContent }
