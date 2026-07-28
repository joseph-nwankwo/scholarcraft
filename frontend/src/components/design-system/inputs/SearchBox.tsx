import { forwardRef, type InputHTMLAttributes, useRef, useCallback } from 'react'
import { Search, X, Command } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  onClear?: () => void
  showShortcut?: boolean
  shortcut?: string
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

const sizeClasses = {
  sm: 'h-8  text-sm pl-8 pr-3',
  md: 'h-9  text-sm pl-9 pr-3',
  lg: 'h-10 text-base pl-10 pr-3',
}
const iconSizes = {
  sm: 'h-3.5 w-3.5 left-2.5',
  md: 'h-4   w-4   left-2.5',
  lg: 'h-4.5 w-4.5 left-3',
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    {
      onClear,
      showShortcut = false,
      shortcut,
      size = 'md',
      isLoading,
      value,
      className,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? inputRef
    const hasValue = Boolean(value)

    const handleClear = useCallback(() => {
      onClear?.()
      resolvedRef.current?.focus()
    }, [onClear, resolvedRef])

    const displayShortcut = shortcut ?? (typeof navigator !== 'undefined' && navigator.platform?.startsWith('Mac') ? '⌘K' : 'Ctrl+K')

    return (
      <div className={cn('relative flex items-center', className)}>
        <span className={cn('absolute text-muted-foreground pointer-events-none', iconSizes[size])} aria-hidden>
          <Search className="h-full w-full" />
        </span>

        <input
          ref={resolvedRef}
          type="search"
          role="searchbox"
          value={value}
          onChange={onChange}
          className={cn(
            'w-full rounded-md border border-input bg-background text-foreground',
            'placeholder:text-muted-foreground',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            '[&::-webkit-search-cancel-button]:hidden',
            sizeClasses[size],
            hasValue && 'pr-8',
            showShortcut && !hasValue && 'pr-16',
          )}
          {...props}
        />

        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {showShortcut && !hasValue && (
          <kbd
            className="absolute right-2.5 hidden sm:flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/70 pointer-events-none"
            aria-label={`Keyboard shortcut: ${displayShortcut}`}
          >
            {shortcut ? (
              shortcut
            ) : (
              <>
                <Command className="h-2.5 w-2.5" aria-hidden />
                <span>K</span>
              </>
            )}
          </kbd>
        )}
      </div>
    )
  }
)
SearchBox.displayName = 'SearchBox'
