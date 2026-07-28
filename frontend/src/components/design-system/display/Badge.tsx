import { cn } from '@/lib/utils'

type Variant = 'default' | 'success' | 'warning' | 'error' | 'outline'
type Size    = 'sm' | 'md' | 'lg'

interface BadgeProps {
  variant?: Variant
  size?:    Size
  className?: string
  children: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  error:   'bg-error/10 text-error border-error/20',
  outline: 'bg-transparent text-foreground border-border',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-1.5 py-0 text-[10px] leading-5',
  md: 'px-2 py-0.5 text-xs',
  lg: 'px-2.5 py-1 text-sm',
}

export function Badge({ variant = 'default', size = 'md', className, children }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium',
      variantClasses[variant],
      sizeClasses[size],
      className,
    )}>
      {children}
    </span>
  )
}
