import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/design-system/buttons/Button'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: { wrap: 'py-8', icon: 'h-10 w-10', title: 'text-base', desc: 'text-sm' },
  md: { wrap: 'py-12', icon: 'h-14 w-14', title: 'text-lg', desc: 'text-sm' },
  lg: { wrap: 'py-20', icon: 'h-16 w-16', title: 'text-xl', desc: 'text-base' },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  const s = sizeStyles[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center gap-4 w-full',
        s.wrap,
        className
      )}
      role="status"
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-muted text-muted-foreground',
            s.icon
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 max-w-sm">
        <p className={cn('font-semibold text-foreground', s.title)}>{title}</p>
        {description && (
          <p className={cn('text-muted-foreground text-pretty', s.desc)}>{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-1">
          {action && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="sm" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
