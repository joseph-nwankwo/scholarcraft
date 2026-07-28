import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { type ReactNode } from 'react'
import { FileText, BarChart2, TrendingUp, FileEdit } from 'lucide-react'
import { analyticsApi, type ReportFrequency, type ReportFormat, type ScheduledReport } from '../../../lib/api/analytics.api'

const FREQ_LABELS: Record<ReportFrequency, string> = {
  DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly',
  SEMESTER: 'Semester', ACADEMIC_SESSION: 'Academic Session',
}

const FORMAT_ICONS: Record<ReportFormat, ReactNode> = {
  PDF:   <FileText className="h-3.5 w-3.5" />,
  CSV:   <BarChart2 className="h-3.5 w-3.5" />,
  EXCEL: <TrendingUp className="h-3.5 w-3.5" />,
  WORD:  <FileEdit className="h-3.5 w-3.5" />,
}

function ScheduledRow({ report, onToggle, onDelete }: {
  report: ScheduledReport
  onToggle: (id: string, isActive: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-4 p-4 border-b border-border last:border-0 hover:bg-muted/20">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{report.name}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${report.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {report.isActive ? 'Active' : 'Paused'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
          <span>{FREQ_LABELS[report.frequency]}</span>
          <span>·</span>
          <span className="flex items-center gap-1">{FORMAT_ICONS[report.format]} {report.format}</span>
          <span>·</span>
          <span>{report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>
          {report.template && <><span>·</span><span>{report.template.name}</span></>}
        </div>
        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
          {report.lastRunAt && <span>Last: {format(new Date(report.lastRunAt), 'MMM d HH:mm')}</span>}
          {report.nextRunAt && <span>Next: {format(new Date(report.nextRunAt), 'MMM d HH:mm')}</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => onToggle(report.id, !report.isActive)}
          className={`text-xs px-2 py-1 rounded border ${report.isActive ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-green-200 text-green-700 hover:bg-green-50'}`}>
          {report.isActive ? 'Pause' : 'Resume'}
        </button>
        <button onClick={() => { if (confirm('Delete scheduled report?')) onDelete(report.id) }}
          className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  )
}

function CreateModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (data: Parameters<typeof analyticsApi.createScheduled>[0]) => void
}) {
  const [form, setForm] = useState({
    name: '',
    frequency: 'WEEKLY' as ReportFrequency,
    format: 'PDF' as ReportFormat,
    recipientsRaw: '',
    isActive: true,
  })

  const handleSubmit = () => {
    if (!form.name.trim() || !form.recipientsRaw.trim()) return
    const recipients = form.recipientsRaw.split(',').map((r) => r.trim()).filter(Boolean)
    onCreate({ name: form.name, frequency: form.frequency, format: form.format, recipients, isActive: form.isActive })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">Schedule New Report</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Report Name *</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekly Teaching Summary"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ReportFrequency }))}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
                {(Object.keys(FREQ_LABELS) as ReportFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQ_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Format</label>
              <select value={form.format} onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as ReportFormat }))}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
                {(['PDF', 'CSV'] as ReportFormat[]).map((f) => (
                  <option key={f} value={f}>{FORMAT_ICONS[f]} {f}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Recipients (comma-separated emails) *</label>
            <textarea value={form.recipientsRaw} onChange={(e) => setForm((f) => ({ ...f, recipientsRaw: e.target.value }))}
              placeholder="user@example.com, head@university.edu"
              rows={2} className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active immediately
          </label>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSubmit} disabled={!form.name.trim() || !form.recipientsRaw.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            Schedule Report
          </button>
          <button onClick={onClose} className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function ScheduledReportsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['scheduled-reports'],
    queryFn: () => analyticsApi.listScheduled(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof analyticsApi.createScheduled>[0]) => analyticsApi.createScheduled(data),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }); setShowCreate(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isActive: boolean } }) =>
      analyticsApi.updateScheduled(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => analyticsApi.deleteScheduled(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['scheduled-reports'] }),
  })

  const active = reports.filter((r) => r.isActive)
  const paused = reports.filter((r) => !r.isActive)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Scheduled Reports</h1>
          <p className="text-sm text-muted-foreground">{reports.length} scheduled · {active.length} active</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90">
          + New Schedule
        </button>
      </div>

      {isLoading && <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>}

      {!isLoading && reports.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">⏰</p>
          <p className="text-lg font-medium">No scheduled reports</p>
          <p className="text-sm">Schedule automatic reports to be emailed to your team</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
            Schedule First Report
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground">Active ({active.length})</h2>
          </div>
          {active.map((r) => (
            <ScheduledRow key={r.id} report={r}
              onToggle={(id, isActive) => updateMutation.mutate({ id, data: { isActive } })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {paused.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-muted-foreground">Paused ({paused.length})</h2>
          </div>
          {paused.map((r) => (
            <ScheduledRow key={r.id} report={r}
              onToggle={(id, isActive) => updateMutation.mutate({ id, data: { isActive } })}
              onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={(d) => createMutation.mutate(d)} />
      )}
    </div>
  )
}
