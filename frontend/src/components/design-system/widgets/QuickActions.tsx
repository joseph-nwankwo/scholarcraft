import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface QuickAction {
  id: string
  label: string
  description?: string
  icon: ReactNode
  onClick: () => void
  color?: 'primary' | 'success' | 'warning' | 'error' | 'default'
  disabled?: boolean
  badge?: string
}

export interface QuickActionsProps {
  actions: QuickAction[]
  title?: string
  columns?: 2 | 3 | 4
  variant?: 'cards' | 'list' | 'compact'
  className?: string
}

const colorMap = {
  primary: { icon: 'bg-primary/10 text-primary', hover: 'hover:border-primary/30 hover:bg-primary/5' },
  success: { icon: 'bg-success-muted text-success', hover: 'hover:border-success/30 hover:bg-success-muted' },
  warning: { icon: 'bg-warning-muted text-warning', hover: 'hover:border-warning/30 hover:bg-warning-muted' },
  error:   { icon: 'bg-error-muted text-error', hover: 'hover:border-error/30 hover:bg-error-muted' },
  default: { icon: 'bg-muted text-muted-foreground', hover: 'hover:border-border/80 hover:bg-muted/50' },
}

const colClasses: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function QuickActions({
  actions,
  title,
  columns = 4,
  variant = 'cards',
  className,
}: QuickActionsProps) {
  if (variant === 'list') {
    return (
      <section className={cn('space-y-2', className)} aria-label={title ?? 'Quick actions'}>
        {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
        <div className="rounded-xl border bg-card shadow-card divide-y overflow-hidden">
          {actions.map((action) => {
            const { icon: iconCls, hover } = colorMap[action.color ?? 'default']
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  hover
                )}
                aria-label={action.label}
              >
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconCls)}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                  )}
                </div>
                {action.badge && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {action.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  if (variant === 'compact') {
    return (
      <section className={cn('space-y-2', className)} aria-label={title ?? 'Quick actions'}>
        {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const { icon: iconCls } = colorMap[action.color ?? 'default']
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5',
                  'text-xs font-medium text-foreground',
                  'hover:bg-muted transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <span className={cn('flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px]', iconCls)} aria-hidden>
                  {action.icon}
                </span>
                {action.label}
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  // cards variant
  return (
    <section className={cn('space-y-4', className)} aria-label={title ?? 'Quick actions'}>
      {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
      <div className={cn('grid gap-3', colClasses[columns])}>
        {actions.map((action) => {
          const { icon: iconCls, hover } = colorMap[action.color ?? 'default']
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'group flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left',
                'shadow-card transition-all duration-150',
                'hover:shadow-hover hover:-translate-y-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                hover
              )}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-105', iconCls)}>
                  {action.icon}
                </div>
                {action.badge && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {action.badge}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground leading-snug">{action.label}</p>
                {action.description && (
                  <p className="text-xs text-muted-foreground leading-snug text-pretty">{action.description}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
