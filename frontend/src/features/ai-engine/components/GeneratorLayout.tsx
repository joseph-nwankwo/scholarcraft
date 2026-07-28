import { useNavigate } from 'react-router-dom'
import { Sparkles, Square, RotateCcw, Copy, BookOpen, Check, ExternalLink, Download, Printer } from 'lucide-react'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { printDocument } from '@/lib/print'

interface Props {
  title: string
  description: string
  icon: React.FC<{ className?: string }>
  isGenerating: boolean
  isDone: boolean
  error: string | null
  content: string
  documentId: string | null
  tokensUsed: number
  onGenerate: () => void
  onCancel: () => void
  onReset: () => void
  formValid: boolean
  children: React.ReactNode
}

export function GeneratorLayout({
  title, description, icon: Icon, isGenerating, isDone, error, content,
  documentId, tokensUsed, onGenerate, onCancel, onReset, formValid, children,
}: Props) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  async function copyContent() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadMarkdown() {
    const blob = new Blob([content], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Left pane: Config form ─────────────────────────────────── */}
      <div className="w-full lg:w-95 shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-border bg-background overflow-y-auto max-h-[50vh] lg:max-h-none">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm">{title}</h1>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>

        <div className="p-5 border-t border-border space-y-2.5">
          {isGenerating ? (
            <Button variant="danger" className="w-full" leftIcon={<Square className="h-4 w-4" />} onClick={onCancel}>
              Stop generating
            </Button>
          ) : isDone ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
                Generate again
              </Button>
              {documentId && (
                <Button variant="primary" className="w-full" leftIcon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: documentId }))}>
                  Open in editor
                </Button>
              )}
            </div>
          ) : (
            <Button variant="primary" className="w-full" leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={onGenerate} disabled={!formValid}>
              Generate
            </Button>
          )}
        </div>
      </div>

      {/* ── Right pane: Output ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Output</span>
            {isDone && (
              <>
                <Badge variant="success" size="sm">Done</Badge>
                <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words</span>
                {tokensUsed > 0 && <span className="text-xs text-muted-foreground">{tokensUsed.toLocaleString()} tokens</span>}
              </>
            )}
            {isGenerating && (
              <Badge variant="warning" size="sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Generating…
                </span>
              </Badge>
            )}
          </div>
          {content && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copyContent}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              {isDone && (
                <Button variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={downloadMarkdown}>
                  Download
                </Button>
              )}
              {isDone && (
                <Button variant="ghost" size="sm" leftIcon={<Printer className="h-4 w-4" />}
                  onClick={() => printDocument(contentRef.current?.innerHTML ?? '', title)}>
                  Print
                </Button>
              )}
              {documentId && (
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: documentId }))}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto bg-surface-1 p-6 lg:p-10">
          {error && <Alert variant="error" description={error} className="mb-4 max-w-3xl mx-auto" />}

          {!content && !isGenerating && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">Configure and generate</p>
              <p className="text-sm mt-1">Fill in the form on the left and click Generate to create your document.</p>
            </div>
          )}

          {(content || isGenerating) && (
            <div className="max-w-3xl mx-auto bg-card border border-border shadow-card px-10 py-12">
              <div ref={contentRef} className={cn(
                'prose dark:prose-invert max-w-none',
                'prose-headings:font-bold prose-headings:text-foreground',
                'prose-h1:text-2xl prose-h1:mb-4',
                'prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3',
                'prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2',
                'prose-h4:text-sm prose-h4:mt-4',
                'prose-p:text-foreground prose-p:leading-relaxed',
                'prose-strong:font-bold prose-strong:text-foreground',
                'prose-blockquote:border-l-4 prose-blockquote:border-border',
                'prose-blockquote:bg-muted/40 prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:rounded-r-lg',
                'prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
                'prose-hr:border-border prose-hr:my-6',
                'prose-table:text-sm prose-td:py-2 prose-th:py-2',
                'prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
                'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-xs',
                'prose-ul:my-3 prose-li:my-1',
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                {isGenerating && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
