import { useState, useRef, useId, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'

export interface TagInputProps
  extends Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional'> {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  status?: FieldStatus
  disabled?: boolean
  maxTags?: number
  allowDuplicates?: boolean
  id?: string
  fieldClassName?: string
}

export function TagInput({
  label,
  hint,
  error,
  required,
  optional,
  value = [],
  onChange,
  placeholder = 'Type and press Enter…',
  status = 'default',
  disabled,
  maxTags,
  allowDuplicates = false,
  id,
  fieldClassName,
}: TagInputProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const effectiveStatus = error ? 'error' : status
  const atMax = maxTags != null && value.length >= maxTags

  const addTag = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (!allowDuplicates && value.includes(trimmed)) { setInput(''); return }
    if (atMax) return
    onChange?.([...value, trimmed])
    setInput('')
  }

  const removeTag = (idx: number) => {
    onChange?.(value.filter((_, i) => i !== idx))
  }

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange?.(value.slice(0, -1))
    }
  }

  const statusBorder: Record<FieldStatus, string> = {
    default: 'border-input',
    success: 'border-success',
    warning: 'border-warning',
    error:   'border-error',
  }

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
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-3 py-1.5',
          'cursor-text transition-colors',
          'focus-within:ring-2 focus-within:ring-ring/30',
          disabled && 'cursor-not-allowed opacity-50',
          statusBorder[effectiveStatus]
        )}
      >
        {value.map((tag, i) => (
          <Badge key={`${tag}-${i}`} variant="secondary" className="h-5.5 gap-0.5 pl-2 pr-0.5 text-xs font-normal">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i) }}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </Badge>
        ))}

        {!atMax && (
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={addTag}
            disabled={disabled}
            placeholder={value.length === 0 ? placeholder : ''}
            aria-label={label}
            aria-invalid={effectiveStatus === 'error'}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed"
          />
        )}
      </div>

      {maxTags && (
        <p className="text-xs text-muted-foreground text-right">{value.length}/{maxTags}</p>
      )}
    </FormField>
  )
}
