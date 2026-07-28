import { type ReactNode } from 'react'
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BannerVariant = 'info' | 'success' | 'warning' | 'error'

const bannerStyles: Record<BannerVariant, { bg: string; border: string; icon: string; Icon: typeof Info }> = {
  info:    { bg: 'bg-info/10',    border: 'border-info/30',    icon: 'text-info',    Icon: Info },
  success: { bg: 'bg-success/10', border: 'border-success/30', icon: 'text-success', Icon: CheckCircle2 },
  warning: { bg: 'bg-warning/10', border: 'border-warning/30', icon: 'text-warning', Icon: AlertTriangle },
  error:   { bg: 'bg-error/10',   border: 'border-error/30',   icon: 'text-error',   Icon: AlertCircle },
}

export interface BannerProps {
  variant?: BannerVariant
  title?: string
  message: ReactNode
  action?: { label: string; onClick: () => void }
  onDismiss?: () => void
  icon?: ReactNode
  sticky?: boolean
  className?: string
}

export function Banner({
  variant = 'info',
  title,
  message,
  action,
  onDismiss,
  icon,
  sticky,
  className,
}: BannerProps) {
  const { bg, border, icon: iconCls, Icon } = bannerStyles[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 border-b px-4 py-3 text-sm',
        bg, border,
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <span className={cn('shrink-0', iconCls)} aria-hidden>
        {icon ?? <Icon className="h-4 w-4" />}
      </span>

      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        {title && <span className="font-semibold">{title}</span>}
        <span className="text-foreground/80">{message}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="rounded-md border border-current/20 bg-background/40 px-2.5 py-1 text-xs font-medium hover:bg-background/60 transition-colors"
          >
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded text-current/60 hover:text-current transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
