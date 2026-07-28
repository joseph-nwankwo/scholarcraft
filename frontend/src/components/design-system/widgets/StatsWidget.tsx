import { type ReactNode } from 'react'
import { StatCard, type StatCardProps } from '@/components/design-system/cards/StatCard'
import { SkeletonStatCard } from '@/components/design-system/feedback/Skeleton'
import { cn } from '@/lib/utils'

export interface StatsWidgetProps {
  stats: StatCardProps[]
  loading?: boolean
  columns?: 2 | 3 | 4
  className?: string
  title?: string
  action?: ReactNode
}

const colClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function StatsWidget({
  stats,
  loading,
  columns = 4,
  className,
  title,
  action,
}: StatsWidgetProps) {
  return (
    <section className={cn('space-y-4', className)} aria-label={title ?? 'Statistics'}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn('grid gap-4', colClasses[columns])}>
        {loading
          ? Array.from({ length: columns }).map((_, i) => <SkeletonStatCard key={i} />)
          : stats.map((stat, i) => <StatCard key={stat.label + i} {...stat} />)
        }
      </div>
    </section>
  )
}
