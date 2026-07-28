import { forwardRef, type TextareaHTMLAttributes, useId, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'

const statusBorder: Record<FieldStatus, string> = {
  default: 'border-input focus:border-ring',
  success: 'border-success focus:border-success',
  warning: 'border-warning focus:border-warning',
  error:   'border-error   focus:border-error',
}

export interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional' | 'hideLabel'> {
  status?: FieldStatus
  autoResize?: boolean
  maxLength?: number
  showCount?: boolean
  fieldClassName?: string
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      hint,
      error,
      required,
      optional,
      hideLabel,
      status = 'default',
      autoResize,
      maxLength,
      showCount,
      fieldClassName,
      id,
      disabled,
      value,
      defaultValue,
      onChange,
      className,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    const effectiveStatus = error ? 'error' : status
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef

    const currentLength = typeof value === 'string' ? value.length : 0

    useEffect(() => {
      if (!autoResize || !textareaRef.current) return
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [value, autoResize, textareaRef])

    return (
      <FormField
        label={label}
        hint={hint}
        error={error}
        required={required}
        optional={optional}
        status={effectiveStatus}
        disabled={disabled}
        htmlFor={fieldId}
        hideLabel={hideLabel}
        className={fieldClassName}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={fieldId}
            rows={rows}
            disabled={disabled}
            maxLength={maxLength}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            aria-invalid={effectiveStatus === 'error'}
            aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
            className={cn(
              'flex w-full rounded-md border bg-background px-3 py-2',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'transition-colors duration-150 resize-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
              'read-only:bg-muted',
              autoResize && 'overflow-hidden',
              statusBorder[effectiveStatus],
              className
            )}
            {...props}
          />

          {showCount && maxLength && (
            <span
              className={cn(
                'absolute bottom-2 right-3 text-[11px] tabular-nums pointer-events-none',
                currentLength >= maxLength ? 'text-error' : 'text-muted-foreground/60'
              )}
              aria-live="polite"
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </FormField>
    )
  }
)
TextareaField.displayName = 'TextareaField'
