import { useState, useCallback, useId } from 'react'
import { Check, ChevronDown, X, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { FormField, type FormFieldProps, type FieldStatus } from './FormField'

export interface MultiSelectOption {
  value: string
  label: string
  description?: string
}

export interface MultiSelectProps
  extends Pick<FormFieldProps, 'label' | 'hint' | 'error' | 'required' | 'optional'> {
  options: MultiSelectOption[]
  value?: string[]
  onChange?: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  status?: FieldStatus
  disabled?: boolean
  maxSelected?: number
  id?: string
  fieldClassName?: string
}

export function MultiSelect({
  label,
  hint,
  error,
  required,
  optional,
  options,
  value = [],
  onChange,
  placeholder = 'Select options…',
  searchPlaceholder = 'Search…',
  status = 'default',
  disabled,
  maxSelected,
  id,
  fieldClassName,
}: MultiSelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const effectiveStatus = error ? 'error' : status

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    o.description?.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = useCallback((optValue: string) => {
    if (!onChange) return
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue))
    } else if (!maxSelected || value.length < maxSelected) {
      onChange([...value, optValue])
    }
  }, [value, onChange, maxSelected])

  const removeOne = useCallback((optValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(value.filter((v) => v !== optValue))
  }, [value, onChange])

  const clear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.([])
  }, [onChange])

  const selectedLabels = value.map((v) => options.find((o) => o.value === v)?.label ?? v)

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-invalid={effectiveStatus === 'error'}
            className={cn(
              'flex min-h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-1.5',
              'text-sm transition-colors text-left',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'hover:bg-muted/30',
              statusBorder[effectiveStatus]
            )}
          >
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                selectedLabels.map((lbl, i) => (
                  <Badge key={value[i]} variant="secondary" className="h-5 gap-0.5 pr-0.5 text-xs">
                    {lbl}
                    <button
                      type="button"
                      onMouseDown={(e) => removeOne(value[i], e)}
                      className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 focus:opacity-100"
                      aria-label={`Remove ${lbl}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 pl-1">
              {value.length > 0 && (
                <span
                  onMouseDown={clear}
                  className="rounded-sm text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear all"
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" sideOffset={4}>
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
            <input
              autoFocus
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div role="listbox" aria-multiselectable className="max-h-56 overflow-y-auto scrollbar-thin py-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No results found.</p>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt.value)
                const atMax = !selected && maxSelected != null && value.length >= maxSelected
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={atMax}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left',
                      'hover:bg-muted focus:bg-muted outline-none transition-colors',
                      selected && 'text-primary',
                      atMax && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', selected ? 'bg-primary border-primary' : 'border-input')}>
                      {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block text-xs text-muted-foreground truncate">{opt.description}</span>
                      )}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          {value.length > 0 && (
            <div className="border-t px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{value.length} selected{maxSelected ? ` / ${maxSelected}` : ''}</span>
              <button type="button" onClick={(e) => clear(e)} className="text-xs text-muted-foreground hover:text-foreground">
                Clear all
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </FormField>
  )
}
