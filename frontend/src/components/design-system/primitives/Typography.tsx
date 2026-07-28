import { type HTMLAttributes, type ElementType, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const typographyVariants = cva('', {
  variants: {
    variant: {
      'display-xl': 'text-[4rem] font-bold leading-none tracking-[-0.04em]',
      'display-lg': 'text-[3rem] font-bold leading-[1.05] tracking-[-0.035em]',
      h1: 'text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em]',
      h2: 'text-[1.875rem] font-semibold leading-[1.2] tracking-[-0.025em]',
      h3: 'text-[1.5rem] font-semibold leading-[1.25] tracking-[-0.02em]',
      h4: 'text-[1.25rem] font-semibold leading-[1.3] tracking-[-0.015em]',
      h5: 'text-[1.125rem] font-semibold leading-[1.4] tracking-[-0.01em]',
      'body-lg': 'text-[1.125rem] font-normal leading-[1.6]',
      'body-md': 'text-base font-normal leading-[1.5]',
      'body-sm': 'text-sm font-normal leading-[1.5]',
      caption: 'text-xs font-normal leading-[1.4] tracking-[0.01em]',
      label: 'text-[0.8125rem] font-medium leading-[1.4] tracking-[0.005em]',
      code: 'text-sm font-normal leading-[1.6] font-mono',
    },
    color: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      info: 'text-info',
      inherit: '',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
      inherit: '',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
    balance: {
      true: 'text-balance',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body-md',
    color: 'default',
    weight: 'inherit',
    truncate: false,
    balance: false,
  },
})

const variantElementMap: Record<string, ElementType> = {
  'display-xl': 'h1',
  'display-lg': 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  'body-lg': 'p',
  'body-md': 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'span',
  code: 'code',
}

export interface TypographyProps
  extends Omit<HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  as?: ElementType
  gradient?: boolean
}

export const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ variant, color, weight, truncate, balance, as, gradient, className, ...props }, ref) => {
    const Tag = as ?? (variant ? variantElementMap[variant] : 'p') ?? 'p'

    return (
      <Tag
        ref={ref as never}
        className={cn(
          typographyVariants({ variant, color, weight, truncate, balance }),
          gradient && 'gradient-text',
          className
        )}
        {...props}
      />
    )
  }
)
Typography.displayName = 'Typography'

export { typographyVariants }
