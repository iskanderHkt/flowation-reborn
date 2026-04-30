interface FieldErrorProps {
  error?: string
  className?: string
}

export function FieldError({ error, className }: FieldErrorProps) {
  if (!error) return null
  return (
    <p className={`text-[11px] text-red-400 mt-1 ${className ?? ''}`}>
      {error}
    </p>
  )
}
