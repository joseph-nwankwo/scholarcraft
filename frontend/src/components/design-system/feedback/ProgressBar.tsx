import { cn } from '@/lib/utils'

export type ProgressVariant = 'primary' | 'success' | 'warning' | 'error' | 'indeterminate'

const trackColors: Record<ProgressVariant, string> = {
  primary:       'bg-primary',
  success:       'bg-success',
  warning:       'bg-warning',
  error:         'bg-error',
  indeterminate: 'bg-primary',
}

export interface ProgressBarProps {
  value?: number
  max?: number
  variant?: ProgressVariant
  label?: string
  showPercent?: boolean
  showValue?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  animated?: boolean
  striped?: boolean
  className?: string
}

const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3' }

export function ProgressBar({
  value = 0,
  max = 100,
  variant = 'primary',
  label,
  showPercent,
  showValue,
  size = 'md',
  animated,
  striped,
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const isIndeterminate = variant === 'indeterminate'

  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || showPercent || showValue) && (
        <div className="flex items-center justify-between gap-2">
          {label && <span className="text-xs font-medium text-foreground">{label}</span>}
          <span className="text-xs text-muted-foreground tabular-nums ml-auto">
            {showValue && `${value}${max !== 100 ? `/${max}` : ''}`}
            {showPercent && !showValue && `${Math.round(pct)}%`}
          </span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className={cn('w-full rounded-full bg-muted overflow-hidden', heights[size])}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            trackColors[variant],
            striped && 'bg-stripes',
            animated && !isIndeterminate && 'transition-[width]',
            isIndeterminate && 'w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite]'
          )}
          style={!isIndeterminate ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  )
}

export interface ProgressRingProps {
  value?: number
  max?: number
  size?: number
  strokeWidth?: number
  variant?: Exclude<ProgressVariant, 'indeterminate'>
  label?: string
  className?: string
}

export function ProgressRing({
  value = 0,
  max = 100,
  size = 48,
  strokeWidth = 4,
  variant = 'primary',
  label,
  className,
}: ProgressRingProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ

  const fillColor: Record<string, string> = {
    primary: 'stroke-primary',
    success: 'stroke-success',
    warning: 'stroke-warning',
    error:   'stroke-error',
  }

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          className={cn('transition-all duration-500 ease-out', fillColor[variant])}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      {label && (
        <span className="absolute text-xs font-semibold text-foreground tabular-nums">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  )
}
