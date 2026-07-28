import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PenLine, Eye } from 'lucide-react'
import { TextareaField } from '@/components/design-system/inputs/TextareaField'
import { cn } from '@/lib/utils'

type Mode = 'write' | 'preview'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

/**
 * A markdown textarea with a Write/Preview toggle. Preview renders the content
 * styled like a formatted thesis manuscript (serif font, justified, indented
 * paragraphs, double-spaced) rather than raw markdown syntax.
 */
export function MarkdownEditor({ value, onChange, placeholder, rows = 10 }: Props) {
  const [mode, setMode] = useState<Mode>(value.trim() ? 'preview' : 'write')
  const [hadContent, setHadContent] = useState(!!value.trim())

  // Switch to the reader-friendly preview the moment content first appears
  // (e.g. right after an AI generation completes), without fighting the
  // user's own choice to keep editing once they've already seen it.
  useEffect(() => {
    if (value.trim() && !hadContent) {
      setMode('preview')
      setHadContent(true)
    } else if (!value.trim() && hadContent) {
      setHadContent(false)
    }
  }, [value, hadContent])

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted">
        <button
          type="button"
          onClick={() => setMode('write')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            mode === 'write' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <PenLine className="h-3.5 w-3.5" /> Write
        </button>
        <button
          type="button"
          onClick={() => setMode('preview')}
          disabled={!value.trim()}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            mode === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-3.5 w-3.5" /> Preview
        </button>
      </div>

      {mode === 'write' ? (
        <TextareaField
          label="Content"
          hideLabel
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="font-mono text-sm"
        />
      ) : (
        <div
          className="thesis-doc rounded-lg border bg-card px-6 py-8 sm:px-14 sm:py-12 overflow-y-auto"
          style={{ maxHeight: `${Math.max(rows * 2.5, 24)}rem` }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
