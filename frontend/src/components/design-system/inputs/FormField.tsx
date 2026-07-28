import { type ReactNode, type HTMLAttributes, useId } from 'react'
import { Check, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FieldStatus = 'default' | 'success' | 'warning' | 'error'

export interface FormFieldProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  status?: FieldStatus
  disabled?: boolean
  children: ReactNode
  htmlFor?: string
  hideLabel?: boolean
  labelClassName?: string
}

const statusStyles: Record<FieldStatus, { hint: string; icon: ReactNode }> = {
  default: { hint: 'text-muted-foreground', icon: null },
  success: { hint: 'text-success', icon: <Check className="h-3 w-3" /> },
  warning: { hint: 'text-warning', icon: <AlertTriangle className="h-3 w-3" /> },
  error:   { hint: 'text-error',   icon: <X className="h-3 w-3" /> },
}

export function FormField({
  label,
  hint,
  error,
  required,
  optional,
  status = 'default',
  disabled,
  children,
  htmlFor,
  hideLabel,
  labelClassName,
  className,
  ...props
}: FormFieldProps) {
  const autoId = useId()
  const fieldId = htmlFor ?? autoId
  const effectiveStatus = error ? 'error' : status
  const { hint: hintColor, icon } = statusStyles[effectiveStatus]
  const message = error ?? hint

  return (
    <div
      className={cn('flex flex-col gap-1.5', disabled && 'opacity-60', className)}
      {...props}
    >
      {label && (
        <div className={cn('flex items-center justify-between gap-2', hideLabel && 'sr-only')}>
          <label
            htmlFor={fieldId}
            className={cn(
              'text-[0.8125rem] font-medium leading-none text-foreground',
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-error" aria-label="required">*</span>
            )}
          </label>
          {optional && (
            <span className="text-xs text-muted-foreground">Optional</span>
          )}
        </div>
      )}

      {/* Inject field ID into the child */}
      <div data-field-id={fieldId} data-status={effectiveStatus}>
        {children}
      </div>

      {message && (
        <p
          id={`${fieldId}-hint`}
          className={cn('flex items-center gap-1 text-xs leading-snug', hintColor)}
          role={effectiveStatus === 'error' ? 'alert' : undefined}
          aria-live={effectiveStatus === 'error' ? 'polite' : undefined}
        >
          {icon && <span aria-hidden className="shrink-0 text-[10px] font-bold">{icon}</span>}
          {message}
        </p>
      )}
    </div>
  )
}

export { statusStyles }
