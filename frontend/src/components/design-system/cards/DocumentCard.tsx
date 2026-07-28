import { MoreHorizontal, Eye, Pencil, Download, Trash2, Copy, FileText, BookOpen, HelpCircle, ClipboardList, Award, Layout, Presentation } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type DocumentType =
  | 'LECTURE_NOTE'
  | 'QUESTION_SET'
  | 'ASSIGNMENT'
  | 'EXAM'
  | 'RUBRIC'
  | 'COURSE_OUTLINE'
  | 'PRESENTATION'
  | 'RESEARCH'
  | 'OTHER'

const docTypeConfig: Record<DocumentType, { label: string; icon: typeof FileText; color: string; bg: string }> = {
  LECTURE_NOTE:   { label: 'Lecture Notes',   icon: BookOpen,      color: 'text-primary',          bg: 'bg-primary/10' },
  QUESTION_SET:   { label: 'Questions',        icon: HelpCircle,    color: 'text-info',             bg: 'bg-info-muted' },
  ASSIGNMENT:     { label: 'Assignment',       icon: ClipboardList, color: 'text-warning',          bg: 'bg-warning-muted' },
  EXAM:           { label: 'Exam',             icon: Award,         color: 'text-error',            bg: 'bg-error-muted' },
  RUBRIC:         { label: 'Rubric',           icon: Layout,        color: 'text-success',          bg: 'bg-success-muted' },
  COURSE_OUTLINE: { label: 'Course Outline',   icon: BookOpen,      color: 'text-indigo-600',       bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  PRESENTATION:   { label: 'Presentation',     icon: Presentation,  color: 'text-purple-600',       bg: 'bg-purple-50 dark:bg-purple-950/30' },
  RESEARCH:       { label: 'Research',         icon: FileText,      color: 'text-teal-600',         bg: 'bg-teal-50 dark:bg-teal-950/30' },
  OTHER:          { label: 'Document',         icon: FileText,      color: 'text-muted-foreground', bg: 'bg-muted' },
}

function formatDate(date?: string | Date): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export interface DocumentCardProps {
  id: string
  title: string
  type: DocumentType
  excerpt?: string
  courseName?: string
  createdAt?: string | Date
  updatedAt?: string | Date
  sizeBytes?: number
  tags?: string[]
  version?: number
  onClick?: () => void
  onView?: () => void
  onEdit?: () => void
  onExport?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  className?: string
}

export function DocumentCard({
  title,
  type,
  excerpt,
  courseName,
  updatedAt,
  sizeBytes,
  tags = [],
  version,
  onClick,
  onView,
  onEdit,
  onExport,
  onDuplicate,
  onDelete,
  className,
}: DocumentCardProps) {
  const config = docTypeConfig[type] ?? docTypeConfig.OTHER
  const Icon = config.icon
  const hasActions = onView || onEdit || onExport || onDuplicate || onDelete

  return (
    <div
      className={cn(
        'group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-card',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-hover hover:-translate-y-px',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', config.bg, config.color)}>
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <Badge
              variant="secondary"
              className={cn('text-[10px] px-1.5 py-0 h-4 mb-1', config.bg, config.color, 'border-0')}
            >
              {config.label}
            </Badge>
            <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{title}</h3>
          </div>
        </div>

        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                aria-label="Document options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onView     && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView() }}><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>}
              {onEdit     && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>}
              {onExport   && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExport() }}><Download className="h-3.5 w-3.5 mr-2" />Export</DropdownMenuItem>}
              {onDuplicate && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate() }}><Copy className="h-3.5 w-3.5 mr-2" />Duplicate</DropdownMenuItem>}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-error focus:text-error focus:bg-error-muted">
                    <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Excerpt */}
      {excerpt && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="h-4 text-[10px] px-1.5">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground self-center">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {courseName && <span className="truncate max-w-[100px]">{courseName}</span>}
          {version && version > 1 && <Badge variant="outline" className="h-4 text-[10px] px-1">v{version}</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          {sizeBytes && <span>{formatBytes(sizeBytes)}</span>}
          {updatedAt && <time dateTime={new Date(updatedAt).toISOString()}>{formatDate(updatedAt)}</time>}
        </div>
      </div>
    </div>
  )
}
