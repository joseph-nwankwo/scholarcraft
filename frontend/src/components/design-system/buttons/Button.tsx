import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'rounded-md border border-transparent',
    'transition-all duration-150 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-primary text-primary-foreground border-primary',
          'hover:bg-primary/90 hover:shadow-hover',
          'active:scale-[0.98] active:bg-primary/95',
        ].join(' '),
        secondary: [
          'bg-secondary text-secondary-foreground border-border',
          'hover:bg-secondary/80 hover:border-border/80',
          'active:scale-[0.98]',
        ].join(' '),
        outline: [
          'bg-transparent text-foreground border-border',
          'hover:bg-muted hover:border-border/80',
          'active:scale-[0.98]',
        ].join(' '),
        ghost: [
          'bg-transparent text-foreground border-transparent',
          'hover:bg-muted',
          'active:scale-[0.98]',
        ].join(' '),
        danger: [
          'bg-error text-error-foreground border-error',
          'hover:bg-error/90 hover:shadow-hover',
          'active:scale-[0.98]',
        ].join(' '),
        success: [
          'bg-success text-success-foreground border-success',
          'hover:bg-success/90 hover:shadow-hover',
          'active:scale-[0.98]',
        ].join(' '),
        link: [
          'bg-transparent text-primary border-transparent underline-offset-4',
          'hover:underline',
          'h-auto p-0',
        ].join(' '),
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-9 px-4 text-sm rounded-md',
        lg: 'h-10 px-5 text-base rounded-md',
        xl: 'h-12 px-6 text-base rounded-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  loadingText?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      fullWidth,
      loading,
      loadingText,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden>{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants }
