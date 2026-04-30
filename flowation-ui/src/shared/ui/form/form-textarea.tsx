import * as React from 'react'
import { cn } from '@/lib/cn.ts'
import { FieldError } from './field-error.tsx'

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  touched?: boolean
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, touched, className, ...rest }, ref) => {
    const showError = touched && !!error

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'min-h-[80px] w-full rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
            'px-2.5 py-2 text-sm text-[var(--color-text-primary)]',
            'placeholder:text-[var(--color-text-muted)]',
            'focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-y transition-colors',
            showError
              ? 'border-red-500/60 focus:ring-red-500/40'
              : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]',
            className,
          )}
          {...rest}
        />
        {showError && <FieldError error={error} />}
      </div>
    )
  },
)
FormTextarea.displayName = 'FormTextarea'
