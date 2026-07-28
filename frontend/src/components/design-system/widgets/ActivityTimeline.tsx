import { type ReactNode } from 'react'
import { FileText, BookOpen, Sparkles, Download, Pencil, Trash2, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/design-system/buttons/Button'
import { SkeletonListItem } from '@/components/design-system/feedback/Skeleton'

export type ActivityType =
  | 'create_document'
  | 'edit_document'
  | 'delete_document'
  | 'generate_ai'
  | 'export'
  | 'create_course'
  | 'login'
  | 'custom'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description?: string
  timestamp: string | Date
  icon?: ReactNode
  href?: string
  meta?: string
}

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  const hr  = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1)  return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24)  return `${hr}h ago`
  if (day < 7)  return `${day}d ago`
  return new Date(date).toLocaleDateString()
}

const activityConfig: Record<ActivityType, { icon: ReactNode; color: string; bg: string }> = {
  create_document: { icon: <Plus className="h-3.5 w-3.5" />,       color: 'text-success', bg: 'bg-success-muted' },
  edit_document:   { icon: <Pencil className="h-3.5 w-3.5" />,     color: 'text-info',    bg: 'bg-info-muted' },
  delete_document: { icon: <Trash2 className="h-3.5 w-3.5" />,     color: 'text-error',   bg: 'bg-error-muted' },
  generate_ai:     { icon: <Sparkles className="h-3.5 w-3.5" />,   color: 'text-primary', bg: 'bg-primary/10' },
  export:          { icon: <Download className="h-3.5 w-3.5" />,   color: 'text-warning', bg: 'bg-warning-muted' },
  create_course:   { icon: <BookOpen className="h-3.5 w-3.5" />,   color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  login:           { icon: <User className="h-3.5 w-3.5" />,       color: 'text-muted-foreground', bg: 'bg-muted' },
  custom:          { icon: <FileText className="h-3.5 w-3.5" />,   color: 'text-muted-foreground', bg: 'bg-muted' },
}

export interface ActivityTimelineProps {
  items: ActivityItem[]
  loading?: boolean
  title?: string
  onLoadMore?: () => void
  hasMore?: boolean
  emptyMessage?: string
  className?: string
  maxItems?: number
}

export function ActivityTimeline({
  items,
  loading,
  title,
  onLoadMore,
  hasMore,
  emptyMessage = 'No recent activity.',
  className,
  maxItems,
}: ActivityTimelineProps) {
  const displayed = maxItems ? items.slice(0, maxItems) : items

  return (
    <section className={cn('space-y-3', className)} aria-label={title ?? 'Activity timeline'}>
      {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="divide-y px-4">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ol className="divide-y divide-border/50">
            {displayed.map((item, i) => {
              const cfg = activityConfig[item.type] ?? activityConfig.custom
              const isLast = i === displayed.length - 1

              return (
                <li key={item.id} className="relative flex items-start gap-3 px-4 py-3 group hover:bg-muted/30 transition-colors">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[27px] top-10 bottom-0 w-px bg-border/50" aria-hidden />
                  )}

                  {/* Icon */}
                  <div className={cn(
                    'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    cfg.bg, cfg.color
                  )}>
                    {item.icon ?? cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm font-medium text-foreground leading-snug truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                    {item.meta && (
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.meta}</p>
                    )}
                  </div>

                  {/* Time */}
                  <time
                    dateTime={new Date(item.timestamp).toISOString()}
                    className="shrink-0 text-[11px] text-muted-foreground pt-0.5 tabular-nums"
                    title={new Date(item.timestamp).toLocaleString()}
                  >
                    {timeAgo(item.timestamp)}
                  </time>
                </li>
              )
            })}
          </ol>
        )}

        {hasMore && onLoadMore && !loading && (
          <div className="border-t px-4 py-2.5">
            <Button variant="ghost" size="sm" fullWidth onClick={onLoadMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}
