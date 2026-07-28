import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FileText, Search, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { generationApi, type GeneratedDocument } from '@/lib/api/generation.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Badge } from '@/components/design-system/display/Badge'
import { Modal } from '@/components/design-system/overlay/Modal'
import { ROUTES, buildRoute } from '@/constants/routes'
import { useToast } from '@/lib/hooks/useToast'

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning'> = {
  DRAFT: 'default', GENERATED: 'default', PUBLISHED: 'success', ARCHIVED: 'warning',
}

const DOC_TYPES = ['All', 'LECTURE_NOTES', 'LESSON_PLAN', 'ASSIGNMENT', 'QUIZ', 'EXAM', 'MARKING_SCHEME', 'PRESENTATION', 'COURSE_OUTLINE']
const DOC_STATUSES = ['All', 'DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED']

export default function DocumentsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [status, setStatus] = useState('All')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<GeneratedDocument | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search, type, status, page],
    queryFn: () => generationApi.listDocuments({
      search: search || undefined,
      type: type !== 'All' ? type : undefined,
      status: status !== 'All' ? status : undefined,
      page, limit: 20,
    }),
    staleTime: 30_000,
  })

  const docs = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const remove = useMutation({
    mutationFn: (id: string) => generationApi.deleteDocument(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['documents'] })
      setDeleteTarget(null)
      toast({ title: 'Document deleted' })
    },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' }),
  })

  function fmtDate(s: string) { return new Date(s).toLocaleDateString() }
  function fmtType(t: string) { return t.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">My Documents</h1>
          {data?.total !== undefined && <span className="text-sm text-muted-foreground">({data.total})</span>}
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(ROUTES.AI_STUDIO)}>
          New document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <TextField placeholder="Search documents…" value={search} leftIcon={<Search className="h-4 w-4" />}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-64" />
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t === 'All' ? 'All types' : fmtType(t)}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          {DOC_STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      {/* Cards */}
      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading documents…</div>}
      {!isLoading && docs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 opacity-20" />
          <p>No documents found. Generate content from AI Studio.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {docs.map((doc: GeneratedDocument) => (
          <div key={doc.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-foreground truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmtType(doc.type)}</p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: doc.id }))}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(doc)}
                  className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {doc.description && <p className="text-xs text-muted-foreground line-clamp-2">{doc.description}</p>}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge variant={STATUS_VARIANT[doc.status] ?? 'default'} size="sm">{doc.status}</Badge>
                {doc.currentVersion?.wordCount ? (
                  <span className="text-xs text-muted-foreground">{doc.currentVersion.wordCount.toLocaleString()} words</span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">{fmtDate(doc.updatedAt)}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" leftIcon={<Eye className="h-4 w-4" />}
              onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: doc.id }))}>
              Open editor
            </Button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            Next
          </button>
        </div>
      )}

      {/* Delete modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete document">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Delete <strong>{deleteTarget?.title}</strong>? All versions will be permanently removed.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget.id)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
