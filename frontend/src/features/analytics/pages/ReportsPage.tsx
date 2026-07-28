import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { type ReactNode } from 'react'
import { GraduationCap, ClipboardList, Bot, Landmark, FileText, BarChart2 } from 'lucide-react'
import { analyticsApi } from '../../../lib/api/analytics.api'
import { DateRangePicker } from '../components/Charts'
import { useAuth } from '../../../app/providers/AuthProvider'

type ReportType = 'teaching' | 'assessment' | 'ai-usage' | 'institution'
type FmtType = 'pdf' | 'csv'

const REPORT_TYPES: Array<{ type: ReportType; label: string; desc: string; icon: ReactNode }> = [
  { type: 'teaching',    label: 'Teaching Activity',   desc: 'Documents, AI usage, approvals',                    icon: <GraduationCap className="h-7 w-7" /> },
  { type: 'assessment',  label: 'Assessment Report',   desc: "Questions, Bloom's, difficulty, assessments",       icon: <ClipboardList className="h-7 w-7" /> },
  { type: 'ai-usage',    label: 'AI Usage Report',     desc: 'Token usage, costs, provider breakdown',            icon: <Bot className="h-7 w-7" /> },
  { type: 'institution', label: 'Institution Report',  desc: 'Full institution overview (admin only)',            icon: <Landmark className="h-7 w-7" /> },
]

function ReportCard({ type, label, desc, icon, onDownload }: {
  type: ReportType; label: string; desc: string; icon: ReactNode
  onDownload: (type: ReportType, format: FmtType) => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onDownload(type, 'pdf')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-border py-1.5 rounded-lg hover:bg-muted transition-colors">
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
        <button onClick={() => onDownload(type, 'csv')}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs border border-border py-1.5 rounded-lg hover:bg-muted transition-colors">
          <BarChart2 className="h-3.5 w-3.5" /> CSV
        </button>
      </div>
    </div>
  )
}

function TemplateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: { name: string; category: string; description?: string; isPublic?: boolean }) => void
}) {
  const [form, setForm] = useState({ name: '', category: 'teaching', description: '', isPublic: false })
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">Save Report Template</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Template Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
              {['teaching', 'assessment', 'ai', 'department', 'institution'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} />
            Share with my institution
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => { if (form.name.trim()) onCreate(form) }}
            disabled={!form.name.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            Save Template
          </button>
          <button onClick={onClose} className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'university_admin' || user?.role === 'administrator' || user?.role === 'dean'
  const today = format(new Date(), 'yyyy-MM-dd')
  const [from, setFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [to, setTo] = useState(today)
  const [fmt, setFmt] = useState<FmtType>('pdf')
  const [, setDownloading] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  const { data: templates = [] } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => analyticsApi.listTemplates(),
  })

  const createTemplateMutation = useMutation({
    mutationFn: (data: Parameters<typeof analyticsApi.createTemplate>[0]) => analyticsApi.createTemplate(data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['report-templates'] }); setShowTemplateModal(false) },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => analyticsApi.deleteTemplate(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['report-templates'] }),
  })

  const handleDownload = (type: ReportType, format: FmtType) => {
    const key = `${type}-${format}`
    setDownloading(key)
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
    const token = localStorage.getItem('accessToken') ?? ''
    const params = new URLSearchParams({ format, from, to })
    void fetch(`${base}/reports/generate/${type}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (res) => {
      if (!res.ok) { alert('Failed to generate report'); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${type}-report.${format}`
      a.click()
      URL.revokeObjectURL(a.href)
    }).finally(() => setDownloading(null))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate and download analytical reports</p>
        </div>
        <button onClick={() => setShowTemplateModal(true)}
          className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
          + Save Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
        <div className="flex gap-2 ml-auto">
          {(['pdf', 'csv'] as FmtType[]).map((f) => (
            <button key={f} onClick={() => setFmt(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                fmt === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
              }`}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {REPORT_TYPES.filter((r) => r.type !== 'institution' || isAdmin).map((r) => (
          <ReportCard key={r.type} {...r} onDownload={handleDownload} />
        ))}
      </div>

      {/* Saved templates */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-foreground">Saved Templates</h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category} · by {t.creator.name}
                    {t.isPublic && ' · Shared'}
                  </p>
                </div>
                <button onClick={() => { if (confirm('Delete template?')) deleteTemplateMutation.mutate(t.id) }}
                  className="text-xs text-red-600 hover:underline shrink-0">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTemplateModal && (
        <TemplateModal
          onClose={() => setShowTemplateModal(false)}
          onCreate={(data) => createTemplateMutation.mutate(data)}
        />
      )}
    </div>
  )
}
