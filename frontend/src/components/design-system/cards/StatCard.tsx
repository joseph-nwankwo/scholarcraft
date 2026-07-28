import { type ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/design-system/feedback/Spinner'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
    direction?: 'up' | 'down' | 'neutral'
  }
  description?: string
  loading?: boolean
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  className?: string
  onClick?: () => void
}

const colorMap = {
  default: { icon: 'bg-muted text-muted-foreground', border: '' },
  primary: { icon: 'bg-primary/10 text-primary', border: 'border-primary/20' },
  success: { icon: 'bg-success-muted text-success', border: 'border-success/20' },
  warning: { icon: 'bg-warning-muted text-warning', border: 'border-warning/20' },
  error:   { icon: 'bg-error-muted text-error', border: 'border-error/20' },
}

const trendColors = {
  up:      'text-success',
  down:    'text-error',
  neutral: 'text-muted-foreground',
}

const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'neutral' }) => {
  if (direction === 'up')      return <TrendingUp  className="h-3.5 w-3.5" />
  if (direction === 'down')    return <TrendingDown className="h-3.5 w-3.5" />
  return <Minus className="h-3.5 w-3.5" />
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  description,
  loading,
  color = 'default',
  className,
  onClick,
}: StatCardProps) {
  const { icon: iconCls, border } = colorMap[color]
  const trendDir = trend?.direction ?? (trend?.value && trend.value > 0 ? 'up' : trend?.value && trend.value < 0 ? 'down' : 'neutral')

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-card',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-hover hover:-translate-y-px',
        border,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-card/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-muted-foreground truncate">{label}</p>
          <p className={cn('mt-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums', loading && 'blur-sm')}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base', iconCls)} aria-hidden>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {trend ? (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColors[trendDir])}>
            <TrendIcon direction={trendDir} />
            <span>
              {trend.value > 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="ml-1 font-normal text-muted-foreground">{trend.label}</span>}
            </span>
          </div>
        ) : (
          <span />
        )}
        {description && (
          <p className="text-xs text-muted-foreground truncate text-right">{description}</p>
        )}
      </div>
    </div>
  )
}
