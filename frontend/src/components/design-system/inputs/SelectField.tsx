import { useId, type ReactNode } from 'react'
import {
  Select, SelectContent, SelectGroup,
  SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}

export interface SelectGroup {
  label: string
  options: SelectOption[]
}

export interface SelectFieldProps
  extends Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional' | 'hideLabel'> {
  options?: SelectOption[]
  groups?: SelectGroup[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  status?: FieldStatus
  disabled?: boolean
  id?: string
  fieldClassName?: string
  triggerClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 text-sm',
  md: 'h-9 text-sm',
  lg: 'h-10 text-base',
}

const statusBorder: Record<FieldStatus, string> = {
  default: 'border-input',
  success: 'border-success',
  warning: 'border-warning',
  error:   'border-error',
}

export function SelectField({
  label,
  hint,
  error,
  required,
  optional,
  hideLabel,
  options,
  groups,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Select…',
  status = 'default',
  disabled,
  id,
  fieldClassName,
  triggerClassName,
  size = 'md',
}: SelectFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const effectiveStatus = error ? 'error' : status

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
      <Select value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={fieldId}
          aria-invalid={effectiveStatus === 'error'}
          className={cn(sizeClasses[size], statusBorder[effectiveStatus], 'focus:ring-2 focus:ring-ring/30', triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options?.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              <span className="flex items-center gap-2">
                {opt.icon && <span className="shrink-0" aria-hidden>{opt.icon}</span>}
                <span>
                  {opt.label}
                  {opt.description && (
                    <span className="block text-xs text-muted-foreground">{opt.description}</span>
                  )}
                </span>
              </span>
            </SelectItem>
          ))}

          {groups?.map((group) => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                  <span className="flex items-center gap-2">
                    {opt.icon && <span className="shrink-0" aria-hidden>{opt.icon}</span>}
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}
