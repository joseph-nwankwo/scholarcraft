import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { FileText, FileEdit, Globe, Hash, Package, Upload } from 'lucide-react'
import { libraryApi, type ExportRecord, type ExportTemplate, type LibraryDocument } from '../../../lib/api/library.api'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string

async function authenticatedDownload(url: string, filename: string) {
  const token = localStorage.getItem('accessToken') ?? ''
  const fullUrl = url.startsWith('http') ? url : `${API_BASE.replace('/api', '')}${url}`
  const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const FORMAT_LABELS: Record<string, { label: string; icon: ReactNode }> = {
  pdf:      { label: 'PDF',           icon: <FileText className="h-4 w-4" /> },
  docx:     { label: 'Word (DOCX)',   icon: <FileEdit className="h-4 w-4" /> },
  html:     { label: 'HTML',          icon: <Globe className="h-4 w-4" /> },
  markdown: { label: 'Markdown',      icon: <Hash className="h-4 w-4" /> },
  txt:      { label: 'Plain Text',    icon: <FileText className="h-4 w-4" /> },
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

function ExportRow({ record }: { record: ExportRecord }) {
  return (
    <div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-card">
      <span className="flex h-8 w-8 items-center justify-center text-muted-foreground">{FORMAT_LABELS[record.format]?.icon ?? <Package className="h-4 w-4" />}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{record.document.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {FORMAT_LABELS[record.format]?.label ?? record.format} · {new Date(record.createdAt).toLocaleString()}
        </p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[record.status] ?? 'bg-muted'}`}>
        {record.status}
      </span>
      {record.status === 'COMPLETED' && record.fileUrl && (
        <button
          onClick={() => void authenticatedDownload(record.fileUrl!, `export.${record.format}`)}
          className="text-xs text-primary border border-primary/30 px-3 py-1 rounded hover:bg-primary/5 shrink-0">
          Download
        </button>
      )}
    </div>
  )
}

function QuickExportPanel() {
  const [docId, setDocId] = useState('')
  const [format, setFormat] = useState('pdf')
  const [mode, setMode] = useState<'instant' | 'queue'>('instant')

  const { data: docsData } = useQuery({
    queryKey: ['library', { limit: 100 }],
    queryFn: () => libraryApi.list({ limit: 100 }),
  })
  const docs: LibraryDocument[] = (docsData as { data: LibraryDocument[] } | undefined)?.data ?? []

  const qc = useQueryClient()
  const queueMutation = useMutation({
    mutationFn: () => libraryApi.queueExport(docId, format),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['exports'] }),
    onError: () => alert('Failed to queue export. Please try again.'),
  })

  const handleInstantDownload = () => {
    if (!docId) return
    const url = libraryApi.downloadDocument(docId, format)
    void authenticatedDownload(url, `document.${format}`)
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5 mb-6">
      <h2 className="font-semibold text-foreground mb-4">Quick Export</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Document</label>
          <select value={docId} onChange={(e) => setDocId(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
            <option value="">— Select document —</option>
            {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
            {Object.entries(FORMAT_LABELS).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Mode</label>
          <select value={mode} onChange={(e) => setMode(e.target.value as 'instant' | 'queue')}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
            <option value="instant">Instant Download</option>
            <option value="queue">Queue (async)</option>
          </select>
        </div>
      </div>
      <button
        disabled={!docId || queueMutation.isPending}
        onClick={mode === 'instant' ? handleInstantDownload : () => queueMutation.mutate()}
        className="mt-4 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {queueMutation.isPending ? 'Queuing…' : mode === 'instant' ? 'Download Now' : 'Queue Export'}
      </button>
    </div>
  )
}

function TemplatesSection() {
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data } = useQuery({
    queryKey: ['export-templates'],
    queryFn: () => libraryApi.listExportTemplates(),
  })
  const templates: ExportTemplate[] = (data as { data: ExportTemplate[] } | undefined)?.data ?? []

  const createMutation = useMutation({
    mutationFn: () => libraryApi.createExportTemplate({ name: newName }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['export-templates'] }); setCreating(false); setNewName('') },
    onError: () => alert('Failed to create template.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => libraryApi.deleteExportTemplate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['export-templates'] }),
    onError: () => alert('Failed to delete template.'),
  })

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Export Templates</h2>
        <button onClick={() => setCreating(true)}
          className="text-sm text-primary hover:underline">+ New template</button>
      </div>

      {creating && (
        <div className="flex gap-2 mb-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name…"
            className="flex-1 border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none" />
          <button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending}
            className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm disabled:opacity-50">Save</button>
          <button onClick={() => { setCreating(false); setNewName('') }}
            className="border border-border px-3 py-1.5 rounded text-sm hover:bg-muted">Cancel</button>
        </div>
      )}

      {templates.length === 0 && !creating && (
        <p className="text-sm text-muted-foreground">No custom templates. Documents use institution default formatting.</p>
      )}

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.category} {t.isDefault && '· Default'}</p>
            </div>
            <button onClick={() => { if (confirm('Delete this template?')) deleteMutation.mutate(t.id) }}
              className="text-xs text-red-600 hover:underline">Remove</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ExportCenterPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['exports', page],
    queryFn: () => libraryApi.listExports(page),
  })

  const records: ExportRecord[] = (data as { data: ExportRecord[] } | undefined)?.data ?? []
  const totalPages: number = (data as { totalPages?: number } | undefined)?.totalPages ?? 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Export Center</h1>

      <QuickExportPanel />

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-foreground">Export History</h2>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Upload className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p>No exports yet</p>
        </div>
      )}

      <div className="space-y-2">
        {records.map((r) => <ExportRow key={r.id} record={r} />)}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
            ← Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
            Next →
          </button>
        </div>
      )}

      <TemplatesSection />
    </div>
  )
}
