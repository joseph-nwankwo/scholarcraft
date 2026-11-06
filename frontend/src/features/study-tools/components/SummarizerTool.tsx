import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Copy, Check, FileText } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextareaField } from '@/components/design-system/inputs/TextareaField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { cn } from '@/lib/utils'
import { studyToolsApi } from '@/lib/api/studyTools.api'
import { UploadDocumentButton } from './UploadDocumentButton'
import type { AcademicLevel } from '../pages/StudyToolsPage'

type Length = 'short' | 'medium' | 'long'

interface Props {
  academicLevel: AcademicLevel
}

export function SummarizerTool({ academicLevel }: Props) {
  const [text, setText]       = useState('')
  const [length, setLength]   = useState<Length>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [summary, setSummary] = useState('')
  const [copied, setCopied]   = useState(false)

  async function handleSummarize(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await studyToolsApi.summarize({ text: text.trim(), length, academicLevel })
      setSummary(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Could not generate a summary. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleSummarize} className="space-y-4">
        {error && <Alert variant="warning" description={error} />}
        <UploadDocumentButton onExtracted={setText} />
        <TextareaField
          label="Paste your notes or article"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste lecture notes, an article, or any text you want summarized… or upload a document above"
          rows={14}
          required
        />
        <SelectField
          label="Summary length"
          value={length}
          onValueChange={(v) => setLength(v as Length)}
          options={[
            { value: 'short', label: 'Short — key bullet points' },
            { value: 'medium', label: 'Medium — a few paragraphs' },
            { value: 'long', label: 'Long — detailed summary' },
          ]}
        />
        <Button type="submit" fullWidth loading={loading} disabled={text.trim().length < 20} leftIcon={<Sparkles className="h-4 w-4" />}>
          Summarize
        </Button>
        {text.trim().length > 0 && text.trim().length < 20 && (
          <p className="text-xs text-muted-foreground">Enter at least 20 characters to summarize.</p>
        )}
      </form>

      <div className={cn('rounded-xl border bg-card p-5 shadow-card', !summary && 'flex items-center justify-center')}>
        {summary ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Summary</h3>
              <Button variant="outline" size="sm" onClick={handleCopy} leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <EmptyState
            size="sm"
            icon={<FileText className="h-6 w-6" />}
            title="Your summary will appear here"
            description="Paste your notes on the left and generate a summary."
          />
        )}
      </div>
    </div>
  )
}
