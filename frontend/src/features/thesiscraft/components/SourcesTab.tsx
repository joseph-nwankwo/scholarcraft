import { useState } from 'react'
import { BookOpen, Search, FileText, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { FileUpload } from '@/components/design-system/inputs/FileUpload'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { thesiscraftApi, type ReferenceChunkMatch, type ReferenceDocumentStatus } from '@/lib/api/thesiscraft.api'
import { useReferences } from '../hooks/useReferences'
import type { useThesis } from '../hooks/useThesis'

const STATUS_META: Record<ReferenceDocumentStatus, { icon: typeof CheckCircle2; variant: 'success' | 'warning' | 'error'; label: string }> = {
  READY:      { icon: CheckCircle2, variant: 'success', label: 'Ready' },
  PROCESSING: { icon: Loader2,      variant: 'warning', label: 'Processing…' },
  FAILED:     { icon: XCircle,      variant: 'error',   label: 'Failed' },
}

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function SourcesTab({ thesisState }: Props) {
  const { thesis } = thesisState
  const referencesState = useReferences(thesis?.id ?? '')
  const { documents, loading, error, upload, remove } = referencesState

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [query, setQuery]           = useState('')
  const [searching, setSearching]   = useState(false)
  const [searchError, setSearchError] = useState('')
  const [results, setResults]       = useState<ReferenceChunkMatch[] | null>(null)

  if (!thesis) return null

  async function handleFilesChange(files: File[]) {
    setUploadError('')
    setUploading(true)
    try {
      await upload(files)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setUploadError(msg ?? 'Could not upload one or more files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearchError('')
    setSearching(true)
    try {
      setResults(await thesiscraftApi.searchReferences(thesis!.id, query.trim()))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSearchError(msg ?? 'Could not search your references. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const readyCount = documents.filter((d) => d.status === 'READY').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sources</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload books, articles, and journals here — the AI drafting Proposal sections and Chapters will draw on
          and cite them where relevant, instead of relying only on general knowledge.
        </p>
      </div>

      {(error || uploadError) && <Alert variant="warning" description={uploadError || error} />}

      <div className="rounded-xl border bg-card p-5 shadow-card">
        <FileUpload
          label="Drop PDF, Word, or text files here, or click to browse"
          hint="PDF, DOCX, DOC, TXT, or MD — up to 20MB each, 5 files at a time"
          accept=".pdf,.doc,.docx,.txt,.md"
          multiple
          maxFiles={5}
          maxSizeMB={20}
          disabled={uploading}
          onFilesChange={handleFilesChange}
        />
        {uploading && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting text and generating embeddings — this can take a minute for large files…
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your reference library…</p>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="No sources uploaded yet"
          description="Upload a reference document above to start building your library."
        />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const meta = STATUS_META[doc.status]
            const Icon = meta.icon
            return (
              <li key={doc.id} className="rounded-xl border bg-card p-4 shadow-card flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{doc.fileName}</p>
                  {doc.status === 'FAILED' && doc.errorMessage ? (
                    <p className="text-xs text-error mt-0.5">{doc.errorMessage}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {doc.status === 'READY' ? `${doc.chunkCount} chunks indexed` : meta.label}
                    </p>
                  )}
                </div>
                <Badge variant={meta.variant} size="sm">
                  <Icon className={`h-3 w-3 mr-1 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                  {meta.label}
                </Badge>
                <button onClick={() => setDeletingId(doc.id)} className="text-muted-foreground hover:text-error p-1.5 rounded-md hover:bg-muted transition-colors shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {readyCount > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground">Search Your Sources</h3>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1">
              <TextField
                label="Search"
                hideLabel
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What do my sources say about long-term retention?"
              />
            </div>
            <Button type="submit" loading={searching} leftIcon={<Search className="h-4 w-4" />}>Search</Button>
          </form>

          {searchError && <Alert variant="warning" description={searchError} />}

          {results && (
            results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No relevant passages found.</p>
            ) : (
              <ul className="space-y-3">
                {results.map((r, i) => (
                  <li key={i} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-primary mb-1">{r.documentName} · {Math.round(r.score * 100)}% match</p>
                    <p className="text-sm text-foreground">{r.content}</p>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this source?"
        description="This will remove the document and its indexed content. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await remove(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}
