import { type ReactNode } from 'react'
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative flex gap-3 rounded-lg border p-4 text-sm',
  {
    variants: {
      variant: {
        info:    'bg-info-muted border-info/20 text-foreground [&_[data-icon]]:text-info',
        success: 'bg-success-muted border-success/20 text-foreground [&_[data-icon]]:text-success',
        warning: 'bg-warning-muted border-warning/20 text-foreground [&_[data-icon]]:text-warning',
        error:   'bg-error-muted border-error/20 text-foreground [&_[data-icon]]:text-error',
      },
    },
    defaultVariants: { variant: 'info' },
  }
)

const icons = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   AlertCircle,
}

export interface AlertProps extends VariantProps<typeof alertVariants> {
  title?: string
  description?: ReactNode
  children?: ReactNode
  onDismiss?: () => void
  action?: { label: string; onClick: () => void }
  icon?: ReactNode
  className?: string
  role?: string
}

export function Alert({
  variant = 'info',
  title,
  description,
  children,
  onDismiss,
  action,
  icon,
  className,
  role = 'alert',
}: AlertProps) {
  const Icon = icons[variant ?? 'info']

  return (
    <div role={role} className={cn(alertVariants({ variant }), className)}>
      <span data-icon className="mt-0.5 shrink-0" aria-hidden>
        {icon ?? <Icon className="h-4 w-4" />}
      </span>

      <div className="flex-1 min-w-0 space-y-1">
        {title && <p className="font-semibold leading-none">{title}</p>}
        {(description ?? children) && (
          <div className="text-sm text-muted-foreground leading-relaxed">{description ?? children}</div>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-xs font-semibold underline underline-offset-2 hover:no-underline transition-all"
          >
            {action.label}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 mt-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
