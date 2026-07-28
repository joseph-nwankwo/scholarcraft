import { FileText, MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface CourseCardProps {
  id: string
  title: string
  code?: string
  level: string
  department?: string
  faculty?: string
  documentCount?: number
  semester?: string
  academicYear?: string
  lastUpdated?: string | Date
  color?: string
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onOpen?: () => void
  className?: string
}

const levelColors: Record<string, string> = {
  '100': 'bg-info-muted text-info-muted-foreground',
  '200': 'bg-success-muted text-success-muted-foreground',
  '300': 'bg-warning-muted text-warning-muted-foreground',
  '400': 'bg-error-muted text-error-muted-foreground',
  '500': 'bg-primary/10 text-primary',
  'Postgraduate': 'bg-primary/10 text-primary',
}

function formatDate(date?: string | Date): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function courseInitials(title: string): string {
  return title.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

const cardColors = [
  'from-blue-500 to-indigo-600',
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-slate-500 to-slate-700',
]

function hashColor(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return cardColors[Math.abs(h) % cardColors.length]
}

export function CourseCard({
  id,
  title,
  code,
  level,
  department,
  faculty,
  documentCount = 0,
  semester,
  academicYear,
  lastUpdated,
  onClick,
  onEdit,
  onDelete,
  onOpen,
  className,
}: CourseCardProps) {
  const gradient = hashColor(id)
  const initials = courseInitials(title)
  const levelColor = levelColors[level] ?? 'bg-muted text-muted-foreground'

  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl border bg-card shadow-card overflow-hidden',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-hover hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      aria-label={`Course: ${title}`}
    >
      {/* Header strip */}
      <div className={cn('flex items-center justify-between gap-2 bg-gradient-to-r px-4 py-3', gradient)}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white text-sm font-bold select-none">
            {initials}
          </div>
          <div className="min-w-0">
            {code && <p className="text-xs font-semibold text-white/80 tracking-wide uppercase">{code}</p>}
            <p className="text-sm font-semibold text-white truncate leading-tight">{title}</p>
          </div>
        </div>

        {(onEdit || onDelete || onOpen) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Course options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onOpen && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen() }}>
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />Open
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                </DropdownMenuItem>
              )}
              {(onOpen || onEdit) && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete() }}
                  className="text-error focus:text-error focus:bg-error-muted"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className={cn('text-xs', levelColor)}>
            Level {level}
          </Badge>
          {semester && (
            <Badge variant="outline" className="text-xs">{semester}</Badge>
          )}
          {academicYear && (
            <Badge variant="outline" className="text-xs">{academicYear}</Badge>
          )}
        </div>

        {(department || faculty) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {department && <p className="truncate">{department}</p>}
            {faculty && <p className="truncate text-muted-foreground/70">{faculty}</p>}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            <span>{documentCount} {documentCount === 1 ? 'document' : 'documents'}</span>
          </div>
          {lastUpdated && (
            <time className="text-xs text-muted-foreground" dateTime={new Date(lastUpdated).toISOString()}>
              {formatDate(lastUpdated)}
            </time>
          )}
        </div>
      </div>
    </div>
  )
}
