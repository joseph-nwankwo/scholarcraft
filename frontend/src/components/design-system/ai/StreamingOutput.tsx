import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/design-system/buttons/IconButton'

export interface StreamingOutputProps {
  content: string
  isStreaming?: boolean
  title?: string
  onRetry?: () => void
  className?: string
  maxHeightCollapsed?: string
}

export function StreamingOutput({
  content,
  isStreaming,
  title,
  onRetry,
  className,
  maxHeightCollapsed = '400px',
}: StreamingOutputProps) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, isStreaming])

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className={cn('flex flex-col rounded-xl border bg-card shadow-card overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {isStreaming && (
            <span className="flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          )}
          <span className="text-xs font-semibold text-foreground truncate">
            {title ?? 'Generated Content'}
          </span>
          {!isStreaming && content && (
            <span className="text-[10px] text-muted-foreground">{wordCount.toLocaleString()} words</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onRetry && !isStreaming && (
            <IconButton
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              tooltip="Regenerate"
              size="sm"
              variant="ghost"
              onClick={onRetry}
            />
          )}
          {content && (
            <IconButton
              icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              tooltip={copied ? 'Copied!' : 'Copy to clipboard'}
              size="sm"
              variant="ghost"
              onClick={copy}
              aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
              className={cn(copied && 'text-success')}
            />
          )}
          <IconButton
            icon={expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            tooltip={expanded ? 'Collapse' : 'Expand'}
            size="sm"
            variant="ghost"
            onClick={() => setExpanded((e) => !e)}
          />
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className={cn(
          'overflow-y-auto scrollbar-thin transition-all duration-300',
          !expanded && 'max-h-[var(--max-h)]'
        )}
        style={{ '--max-h': maxHeightCollapsed } as React.CSSProperties}
      >
        {content ? (
          <div className={cn('p-5 text-sm text-foreground leading-relaxed whitespace-pre-wrap font-[inherit]', isStreaming && 'ai-cursor')}>
            {content}
          </div>
        ) : isStreaming ? (
          <div className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
            <span className="ai-cursor" />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Output will appear here
          </div>
        )}
      </div>
    </div>
  )
}
