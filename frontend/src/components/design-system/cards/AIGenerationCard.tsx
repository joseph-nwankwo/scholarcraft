import { Sparkles, Clock, Cpu, Eye, Copy, Trash2, MoreHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface AIGenerationCardProps {
  id: string
  moduleType: string
  provider: string
  model: string
  title?: string
  excerpt?: string
  tokensInput?: number
  tokensOutput?: number
  durationMs?: number
  createdAt?: string | Date
  onClick?: () => void
  onView?: () => void
  onCopy?: () => void
  onDelete?: () => void
  className?: string
}

const providerColors: Record<string, { label: string; color: string; bg: string }> = {
  anthropic: { label: 'Claude',  color: 'text-[#D4A574]', bg: 'bg-[#D4A574]/10' },
  openai:    { label: 'OpenAI',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  google:    { label: 'Gemini',  color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/30' },
}

const moduleLabels: Record<string, string> = {
  'lecture-notes':  'Lecture Notes',
  'questions':      'Question Set',
  'assignment':     'Assignment',
  'exam':           'Exam Paper',
  'rubric':         'Marking Rubric',
  'course-outline': 'Course Outline',
  'presentation':   'Presentation',
}

function formatDuration(ms?: number): string {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function timeAgo(date?: string | Date): string {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)  return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}h ago`
  return new Date(date).toLocaleDateString()
}

export function AIGenerationCard({
  moduleType,
  provider,
  model,
  title,
  excerpt,
  tokensInput,
  tokensOutput,
  durationMs,
  createdAt,
  onClick,
  onView,
  onCopy,
  onDelete,
  className,
}: AIGenerationCardProps) {
  const provConfig = providerColors[provider.toLowerCase()] ?? { label: provider, color: 'text-muted-foreground', bg: 'bg-muted' }
  const moduleLabel = moduleLabels[moduleType] ?? moduleType

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-hover hover:-translate-y-px',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{moduleLabel}</p>
            {title && <p className="text-sm font-semibold text-foreground truncate">{title}</p>}
          </div>
        </div>

        {(onView || onCopy || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {onView   && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView() }}><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>}
              {onCopy   && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy() }}><Copy className="h-3.5 w-3.5 mr-2" />Copy</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-error focus:text-error"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
        <Badge variant="secondary" className={cn('text-[10px] h-4 px-1.5 border-0', provConfig.bg, provConfig.color)}>
          {provConfig.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">{model}</span>

        <div className="ml-auto flex items-center gap-2.5 text-[10px] text-muted-foreground">
          {(tokensInput || tokensOutput) && (
            <span className="flex items-center gap-0.5">
              <Cpu className="h-3 w-3" aria-hidden />
              {((tokensInput ?? 0) + (tokensOutput ?? 0)).toLocaleString()} tokens
            </span>
          )}
          {durationMs && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" aria-hidden />
              {formatDuration(durationMs)}
            </span>
          )}
          {createdAt && (
            <time dateTime={new Date(createdAt).toISOString()}>{timeAgo(createdAt)}</time>
          )}
        </div>
      </div>
    </div>
  )
}
