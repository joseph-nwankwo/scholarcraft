import { useState } from 'react'
import { Plus, Sparkles, AlignLeft } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { cn } from '@/lib/utils'
import { thesiscraftApi } from '@/lib/api/thesiscraft.api'
import { MarkdownEditor } from './MarkdownEditor'
import type { useThesis } from '../hooks/useThesis'
import type { ChapterStatus } from '@/lib/api/thesiscraft.api'

const STATUS_VARIANT: Record<ChapterStatus, 'default' | 'warning' | 'success'> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETE: 'success',
}
const STATUS_OPTIONS: { value: ChapterStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
]
const SUGGESTED_CHAPTERS = [
  'Chapter 1: Introduction',
  'Chapter 2: Literature Review',
  'Chapter 3: Methodology',
  'Chapter 4: Results',
  'Chapter 5: Discussion',
  'Chapter 6: Conclusion',
]

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function ChaptersTab({ thesisState }: Props) {
  const { thesis, addChapter, updateChapter, removeChapter } = thesisState
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [newTitle, setNewTitle]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]           = useState('')

  if (!thesis) return null

  const selected = thesis.chapters.find((c) => c.id === selectedId) ?? null

  async function handleAdd(title: string) {
    if (!title.trim()) return
    setAdding(true)
    try {
      const chapter = await addChapter(title.trim())
      setNewTitle('')
      setSelectedId(chapter.id)
    } finally {
      setAdding(false)
    }
  }

  if (thesis.chapters.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<AlignLeft className="h-7 w-7" />}
          title="No chapters yet"
          description="Add your first chapter, or start from the standard thesis structure below."
        />
        <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); handleAdd(newTitle) }} className="flex gap-3">
            <div className="flex-1">
              <TextField label="Chapter title" hideLabel value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Chapter 1: Introduction" />
            </div>
            <Button type="submit" loading={adding} leftIcon={<Plus className="h-4 w-4" />}>Add Chapter</Button>
          </form>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Or quick-add the standard structure:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_CHAPTERS.map((title) => (
                <button
                  key={title}
                  onClick={() => handleAdd(title)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  + {title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleAdd(newTitle) }} className="flex gap-2">
          <TextField hideLabel label="Chapter title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New chapter…" />
          <Button type="submit" size="md" loading={adding} disabled={!newTitle.trim()}><Plus className="h-4 w-4" /></Button>
        </form>
        <ul className="space-y-1.5">
          {thesis.chapters.map((chapter) => (
            <li key={chapter.id}>
              <button
                onClick={() => setSelectedId(chapter.id)}
                className={cn(
                  'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                  selected?.id === chapter.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted'
                )}
              >
                <p className="text-sm font-medium text-foreground truncate">{chapter.title}</p>
                <Badge variant={STATUS_VARIANT[chapter.status]} size="sm" className="mt-1">
                  {chapter.status.replace('_', ' ').toLowerCase()}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:col-span-2">
        {error && <Alert variant="warning" description={error} className="mb-4" />}
        {selected ? (
          <ChapterEditor
            key={selected.id}
            chapter={selected}
            thesisId={thesis.id}
            onUpdate={(data) => updateChapter(selected.id, data)}
            onDeleteRequest={() => setDeletingId(selected.id)}
            onError={setError}
          />
        ) : (
          <EmptyState size="sm" icon={<AlignLeft className="h-6 w-6" />} title="Select a chapter" description="Choose a chapter from the list to start writing." />
        )}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this chapter?"
        description="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) {
            await removeChapter(deletingId)
            if (selectedId === deletingId) setSelectedId(null)
          }
          setDeletingId(null)
        }}
      />
    </div>
  )
}

function ChapterEditor({ chapter, thesisId, onUpdate, onDeleteRequest, onError }: {
  chapter: NonNullable<ReturnType<typeof useThesis>['thesis']>['chapters'][number]
  thesisId: string
  onUpdate: (data: Partial<{ title: string; content: string | null; status: ChapterStatus }>) => Promise<unknown>
  onDeleteRequest: () => void
  onError: (msg: string) => void
}) {
  const [title, setTitle]     = useState(chapter.title)
  const [content, setContent] = useState(chapter.content ?? '')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving]   = useState(false)

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  async function handleGenerate() {
    onError('')
    setGenerating(true)
    try {
      const draft = await thesiscraftApi.generateChapterDraft(thesisId, title)
      setContent(draft)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      onError(msg ?? 'Could not generate a chapter draft. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onUpdate({ title: title.trim(), content })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <TextField label="Chapter title" hideLabel value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />
        <SelectField
          value={chapter.status}
          onValueChange={(v) => onUpdate({ status: v as ChapterStatus })}
          options={STATUS_OPTIONS}
          fieldClassName="w-40 shrink-0"
        />
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" loading={generating} leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={handleGenerate}>
          Generate Draft with AI
        </Button>
        <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words</span>
      </div>

      <MarkdownEditor
        value={content}
        onChange={setContent}
        placeholder="Write your chapter content here, or generate a draft to get started…"
        rows={18}
      />

      <div className="flex gap-3">
        <Button onClick={handleSave} loading={saving}>Save Chapter</Button>
        <Button variant="outline" onClick={onDeleteRequest}>Delete Chapter</Button>
      </div>
    </div>
  )
}
