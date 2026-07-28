import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Save, GitBranch, ChevronRight,
  Eye, Edit2, Trash2, RotateCcw, Check, Copy, FileText, ChevronDown, Printer,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { generationApi, type DocumentVersion } from '@/lib/api/generation.api'
import { printDocument } from '@/lib/print'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Modal } from '@/components/design-system/overlay/Modal'
import { useToast } from '@/lib/hooks/useToast'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'

type View = 'editor' | 'preview' | 'versions'
type ExportFormat = 'markdown' | 'pdf' | 'docx' | 'html'

const EXPORT_FORMATS: { format: ExportFormat; label: string; ext: string }[] = [
  { format: 'markdown', label: 'Markdown (.md)',  ext: 'md'   },
  { format: 'pdf',      label: 'PDF',             ext: 'pdf'  },
  { format: 'docx',     label: 'Word (.docx)',    ext: 'docx' },
  { format: 'html',     label: 'HTML',            ext: 'html' },
]

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default', GENERATED: 'default', PUBLISHED: 'success', ARCHIVED: 'warning',
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  const [view, setView] = useState<View>('preview')
  const [content, setContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const { data: docData, isLoading, error: docError } = useQuery({
    queryKey: ['document', id],
    queryFn: () => generationApi.getDocument(id!),
    enabled: !!id,
  })

  const doc = docData?.data

  // Initialise editor content from the document
  useEffect(() => {
    if (doc) {
      const initialContent = doc.currentVersion?.markdownContent ?? doc.content ?? ''
      setContent(typeof initialContent === 'string' ? initialContent : '')
      setIsDirty(false)
    }
  }, [doc?.id]) // only reset when document changes, not on every update

  const { data: versionsData } = useQuery({
    queryKey: ['document-versions', id],
    queryFn: () => generationApi.listVersions(id!),
    enabled: !!id && view === 'versions',
  })

  const versions = versionsData?.data ?? []

  const saveVersion = useMutation({
    mutationFn: () => generationApi.createVersion(id!, content),
    onSuccess: () => {
      setIsDirty(false)
      void qc.invalidateQueries({ queryKey: ['document', id] })
      void qc.invalidateQueries({ queryKey: ['document-versions', id] })
      toast({ title: 'Version saved' })
    },
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  })

  const updateMeta = useMutation({
    mutationFn: (data: { status?: string; title?: string }) => generationApi.updateDocument(id!, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['document', id] }),
    onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
  })

  const restoreVersion = useMutation({
    mutationFn: (versionId: string) => generationApi.restoreVersion(id!, versionId),
    onSuccess: (data) => {
      setContent(data.data.markdownContent)
      setIsDirty(false)
      void qc.invalidateQueries({ queryKey: ['document', id] })
      void qc.invalidateQueries({ queryKey: ['document-versions', id] })
      toast({ title: `Restored to version ${data.data.version}` })
    },
    onError: () => toast({ title: 'Failed to restore', variant: 'destructive' }),
  })

  const deleteDoc = useMutation({
    mutationFn: () => generationApi.deleteDocument(id!),
    onSuccess: () => { navigate(ROUTES.GEN_DOCUMENTS); toast({ title: 'Document deleted' }) },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' }),
  })

  async function copyContent() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function exportAs(format: ExportFormat) {
    setExportOpen(false)
    if (format === 'markdown') {
      const blob = new Blob([content], { type: 'text/markdown' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${doc!.title}.md`
      a.click()
      URL.revokeObjectURL(a.href)
      return
    }
    setExporting(true)
    try {
      const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch(`${base}/exports/documents/${id}/download?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Export failed' })) as { message?: string }
        toast({ title: err.message ?? 'Export failed', variant: 'destructive' })
        return
      }
      const blob = await res.blob()
      const ext = EXPORT_FORMATS.find((f) => f.format === format)?.ext ?? format
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${doc!.title}.${ext}`
      a.click()
      URL.revokeObjectURL(a.href)
      toast({ title: `Exported as ${ext.toUpperCase()}` })
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' })
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-[calc(100vh-4rem)] text-muted-foreground">Loading document…</div>
  }

  if (docError || !doc) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <Alert variant="error" description="Document not found or failed to load." />
        <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(ROUTES.GEN_DOCUMENTS)}>Back to documents</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0 gap-3">
        {/* Left: nav + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(ROUTES.GEN_DOCUMENTS)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">{doc.title}</span>
            <Badge variant={STATUS_VARIANT[doc.status] ?? 'default'} size="sm">{doc.status}</Badge>
            {isDirty && <Badge variant="warning" size="sm">Unsaved</Badge>}
          </div>
        </div>

        {/* Centre: view toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5 shrink-0">
          {(['editor', 'preview', 'versions'] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn('px-3 py-1.5 text-xs rounded-md transition-colors capitalize flex items-center gap-1.5',
                view === v ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground')}>
              {v === 'editor' && <Edit2 className="h-3 w-3" />}
              {v === 'preview' && <Eye className="h-3 w-3" />}
              {v === 'versions' && <GitBranch className="h-3 w-3" />}
              {v}
            </button>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={copyContent}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="ghost" size="sm" leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => printDocument(printRef.current?.innerHTML ?? '', doc?.title ?? 'Document')}>
            Print
          </Button>

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <Button variant="ghost" size="sm" loading={exporting}
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1">
              Export
              <ChevronDown className="h-3 w-3" />
            </Button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-border bg-background shadow-lg py-1">
                  {EXPORT_FORMATS.map(({ format, label }) => (
                    <button key={format} onClick={() => void exportAs(format)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {doc.status !== 'PUBLISHED' && (
            <Button variant="outline" size="sm" onClick={() => updateMeta.mutate({ status: 'PUBLISHED' })}>
              Publish
            </Button>
          )}
          <Button variant="primary" size="sm" leftIcon={<Save className="h-4 w-4" />} loading={saveVersion.isPending}
            disabled={!isDirty} onClick={() => saveVersion.mutate()}>
            Save
          </Button>
          <button onClick={() => setDeleteOpen(true)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {view === 'editor' && (
          <div className="h-full overflow-y-auto bg-surface-1 px-6 py-10">
            <div className="max-w-3xl mx-auto bg-card border border-border shadow-card">
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); setIsDirty(true) }}
                className="w-full h-full min-h-[70vh] resize-none bg-transparent px-10 py-12 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
                placeholder="Start typing to edit…"
                spellCheck={false}
              />
            </div>
          </div>
        )}

        {view === 'preview' && (
          <div className="h-full overflow-y-auto bg-surface-1 px-6 py-10">
            {content ? (
              <div className="max-w-3xl mx-auto bg-card border border-border shadow-card px-10 py-12">
                <div ref={printRef} className={cn(
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
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm text-center mt-16">Nothing to preview — start writing in the editor.</p>
            )}
          </div>
        )}

        {view === 'versions' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-3">
              <p className="text-sm text-muted-foreground">{versions.length} version{versions.length !== 1 ? 's' : ''} saved</p>
              {versions.length === 0 && <p className="text-muted-foreground text-sm">No previous versions. Save the document to create one.</p>}
              {versions.map((v: DocumentVersion) => (
                <div key={v.id} className={cn(
                  'flex items-start justify-between rounded-xl border border-border bg-card p-4 gap-4',
                  doc.currentVersionId === v.id && 'border-primary/40 bg-primary/5',
                )}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0',
                      doc.currentVersionId === v.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      v{v.version}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">Version {v.version}
                        {doc.currentVersionId === v.id && <span className="ml-2 text-xs text-primary font-normal">(current)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.createdAt).toLocaleString()} · {v.wordCount.toLocaleString()} words
                        {v.tokenUsage > 0 && ` · ${v.tokenUsage.toLocaleString()} tokens`}
                      </p>
                    </div>
                  </div>
                  {doc.currentVersionId !== v.id && (
                    <Button variant="outline" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} loading={restoreVersion.isPending}
                      onClick={() => restoreVersion.mutate(v.id)}>
                      Restore
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete document">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">This will permanently delete <strong>{doc.title}</strong> and all its versions. This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={deleteDoc.isPending} onClick={() => deleteDoc.mutate()}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
