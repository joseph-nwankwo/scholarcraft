import { cn } from '@/lib/utils'

const sizes = {
  xs: 'h-3 w-3 border-[1.5px]',
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-[2.5px]',
  xl: 'h-8 w-8 border-[3px]',
}

const colors = {
  primary:   'border-primary/20 border-t-primary',
  secondary: 'border-muted-foreground/20 border-t-muted-foreground',
  white:     'border-white/20 border-t-white',
  success:   'border-success/20 border-t-success',
  error:     'border-error/20 border-t-error',
  warning:   'border-warning/20 border-t-warning',
}

export interface SpinnerProps {
  size?: keyof typeof sizes
  color?: keyof typeof colors
  className?: string
  label?: string
}

export function Spinner({
  size = 'md',
  color = 'primary',
  className,
  label = 'Loading…',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block animate-spin rounded-full', sizes[size], colors[color], className)}
    />
  )
}

export function SpinnerOverlay({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center rounded-inherit bg-background/60 backdrop-blur-sm"
      role="status"
      aria-label={label}
    >
      <Spinner size="lg" />
    </div>
  )
}

export function FullPageSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background"
      role="status"
      aria-label={label}
    >
      <Spinner size="xl" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
