import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center shrink-0',
    'rounded-md border border-transparent',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:   'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        secondary: 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 active:scale-95',
        outline:   'bg-transparent text-foreground border-border hover:bg-muted active:scale-95',
        ghost:     'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95',
        danger:    'bg-error text-error-foreground hover:bg-error/90 active:scale-95',
      },
      size: {
        xs: 'h-6 w-6',
        sm: 'h-7 w-7',
        md: 'h-8 w-8',
        lg: 'h-9 w-9',
        xl: 'h-10 w-10',
      },
      round: {
        true: 'rounded-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'md',
      round: false,
    },
  }
)

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  icon: ReactNode
  tooltip?: string
  loading?: boolean
}

const IconButtonInner = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant, size, round, icon, tooltip: _tooltip, loading, disabled, className, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      className={cn(iconButtonVariants({ variant, size, round }), className)}
      {...props}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        : <span className="contents" aria-hidden>{icon}</span>
      }
    </button>
  )
)
IconButtonInner.displayName = 'IconButtonInner'

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ tooltip, 'aria-label': ariaLabel, ...props }, ref) => {
    if (tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButtonInner ref={ref} aria-label={ariaLabel ?? tooltip} {...props} />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      )
    }
    return <IconButtonInner ref={ref} aria-label={ariaLabel} {...props} />
  }
)
IconButton.displayName = 'IconButton'
