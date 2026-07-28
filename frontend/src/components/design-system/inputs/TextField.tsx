import { forwardRef, type ReactNode, type InputHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/utils'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'

const statusBorder: Record<FieldStatus, string> = {
  default: 'border-input focus:border-ring',
  success: 'border-success focus:border-success',
  warning: 'border-warning focus:border-warning',
  error:   'border-error   focus:border-error',
}

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional' | 'hideLabel'> {
  status?: FieldStatus
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  leftAddon?: string
  rightAddon?: string
  fieldSize?: 'sm' | 'md' | 'lg'
  fieldClassName?: string
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      hint,
      error,
      required,
      optional,
      hideLabel,
      status = 'default',
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      fieldSize = 'md',
      fieldClassName,
      id,
      disabled,
      className,
      ...inputProps
    },
    ref
  ) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    const effectiveStatus = error ? 'error' : status

    const heightCls = { sm: 'h-8 text-sm', md: 'h-9 text-sm', lg: 'h-10 text-base' }[fieldSize]
    const iconPad = { left: leftIcon ? 'pl-9' : leftAddon ? '' : 'pl-3', right: rightIcon ? 'pr-9' : rightAddon ? '' : 'pr-3' }

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
        <div className="relative flex items-stretch">
          {leftAddon && (
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
              {leftAddon}
            </span>
          )}

          <div className="relative flex-1">
            {leftIcon && (
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden>
                {leftIcon}
              </span>
            )}

            <input
              ref={ref}
              id={fieldId}
              disabled={disabled}
              aria-invalid={effectiveStatus === 'error'}
              aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
              className={cn(
                'flex w-full rounded-md border bg-background text-foreground',
                'placeholder:text-muted-foreground',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-0',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
                'read-only:bg-muted',
                heightCls,
                iconPad.left,
                iconPad.right,
                statusBorder[effectiveStatus],
                leftAddon  && 'rounded-l-none',
                rightAddon && 'rounded-r-none',
                className
              )}
              {...inputProps}
            />

            {rightIcon && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden>
                {rightIcon}
              </span>
            )}
          </div>

          {rightAddon && (
            <span className="inline-flex items-center rounded-r-md border border-l-0 border-input bg-muted px-3 text-sm text-muted-foreground select-none">
              {rightAddon}
            </span>
          )}
        </div>
      </FormField>
    )
  }
)
TextField.displayName = 'TextField'
