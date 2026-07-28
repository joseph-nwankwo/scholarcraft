import { forwardRef, useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'

export interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>,
    Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional'> {
  status?: FieldStatus
  showStrength?: boolean
  fieldClassName?: string
}

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak',   color: 'bg-error' }
  if (score <= 3) return { score, label: 'Fair',   color: 'bg-warning' }
  if (score <= 4) return { score, label: 'Good',   color: 'bg-info' }
  return          { score, label: 'Strong', color: 'bg-success' }
}

const statusBorder: Record<FieldStatus, string> = {
  default: 'border-input focus:border-ring',
  success: 'border-success',
  warning: 'border-warning',
  error:   'border-error',
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      label = 'Password',
      hint,
      error,
      required,
      optional,
      status = 'default',
      showStrength,
      fieldClassName,
      id,
      disabled,
      value,
      className,
      ...props
    },
    ref
  ) => {
    const autoId = useId()
    const fieldId = id ?? autoId
    const [visible, setVisible] = useState(false)
    const effectiveStatus = error ? 'error' : status
    const strength = showStrength && typeof value === 'string' ? getStrength(value) : null

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
        className={fieldClassName}
      >
        <div className="space-y-1.5">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden>
              <Lock className="h-4 w-4" />
            </span>

            <input
              ref={ref}
              id={fieldId}
              type={visible ? 'text' : 'password'}
              disabled={disabled}
              value={value}
              autoComplete="current-password"
              aria-invalid={effectiveStatus === 'error'}
              aria-describedby={hint || error ? `${fieldId}-hint` : undefined}
              className={cn(
                'flex h-9 w-full rounded-md border bg-background pl-9 pr-10 text-sm text-foreground',
                'placeholder:text-muted-foreground transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
                'disabled:cursor-not-allowed disabled:opacity-50',
                statusBorder[effectiveStatus],
                className
              )}
              {...props}
            />

            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              disabled={disabled}
              aria-label={visible ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:pointer-events-none"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {strength && strength.label && (
            <div className="space-y-1" aria-live="polite" aria-label={`Password strength: ${strength.label}`}>
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-all duration-300',
                      i < strength.score ? strength.color : 'bg-muted'
                    )}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">{strength.label}</p>
            </div>
          )}
        </div>
      </FormField>
    )
  }
)
PasswordField.displayName = 'PasswordField'
