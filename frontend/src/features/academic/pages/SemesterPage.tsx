import { useState, useCallback } from 'react'
import { Clock, Plus, Pencil, Trash2, Star } from 'lucide-react'
import { sessionApi, type Semester, type AcademicSession } from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { DataTable, type Column } from '@/components/design-system/data/DataTable'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface FormState {
  academicSessionId: string; name: string; number: string
  startDate: string; endDate: string; current: boolean
}
const EMPTY: FormState = { academicSessionId: '', name: '', number: '1', startDate: '', endDate: '', current: false }

const COLUMNS: Column<Semester>[] = [
  {
    key: 'name',
    header: 'Semester',
    sortable: true,
    cell: (s) => (
      <div className="flex items-center gap-2">
        {s.current && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
        <div>
          <p className="font-medium text-foreground">{s.name}</p>
          <p className="text-xs text-muted-foreground">Semester {s.number}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'academicSession',
    header: 'Session',
    cell: (s) => <span className="text-sm text-muted-foreground">{s.academicSession?.name ?? '—'}</span>,
  },
  {
    key: 'startDate',
    header: 'Period',
    cell: (s) => (
      <span className="text-sm text-muted-foreground">
        {new Date(s.startDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })} —{' '}
        {new Date(s.endDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    ),
  },
  {
    key: 'current',
    header: 'Status',
    cell: (s) => s.current ? <Badge variant="success" size="sm">Current</Badge> : <Badge variant="default" size="sm">Inactive</Badge>,
  },
  {
    key: '_count',
    header: 'Courses',
    cell: (s) => <span className="text-sm text-muted-foreground">{s._count?.courses ?? 0}</span>,
  },
]

export default function SemesterPage() {
  const [sessionFilter, setSessionFilter] = useState('')
  const [dialog, setDialog]     = useState<{ mode: 'create' | 'edit'; sem?: Semester } | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState('')
  const [deleteTarget, setDelete] = useState<Semester | null>(null)

  const { data: semesters, loading, error, reload } = useAsync(
    () => sessionApi.listSemesters(sessionFilter || undefined),
    [sessionFilter]
  )
  const { data: sessionsData } = useAsync(() => sessionApi.list(), [])

  const sessions: AcademicSession[] = sessionsData?.data ?? []
  const semList: Semester[] = Array.isArray(semesters?.data) ? semesters.data : []

  function upd(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: field === 'current' ? (e.target as HTMLInputElement).checked : e.target.value }))
  }

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY, academicSessionId: sessionFilter || (sessions[0]?.id ?? '') })
    setFormErr(''); setDialog({ mode: 'create' })
  }, [sessionFilter, sessions])

  const openEdit = useCallback((s: Semester) => {
    setForm({
      academicSessionId: s.academicSessionId,
      name: s.name, number: String(s.number),
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      current: s.current,
    })
    setFormErr(''); setDialog({ mode: 'edit', sem: s })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.academicSessionId || !form.name || !form.startDate || !form.endDate) { setFormErr('All fields are required'); return }
    setSaving(true); setFormErr('')
    try {
      const payload = { ...form, number: parseInt(form.number) || 1 }
      if (dialog?.mode === 'create') await sessionApi.createSemester(payload)
      else await sessionApi.updateSemester(dialog!.sem!.id, payload)
      setDialog(null); reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await sessionApi.deleteSemester(deleteTarget.id); setDelete(null); reload() } catch { /**/ }
  }

  const ACTIONS: Column<Semester> = {
    key: 'id', header: '',
    cell: (s) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(s)} />
        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDelete(s)} className="text-destructive hover:text-destructive" disabled={s.current} />
      </div>
    ),
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Semesters
          </h1>
          <p className="text-sm text-muted-foreground">{semList.length} semesters</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Semester</Button>
      </div>

      <div className="flex items-center gap-3">
        <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All sessions</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : semList.length === 0 ? (
        <EmptyState icon={<Clock className="h-6 w-6" />} title="No semesters" description="Add semesters to your academic sessions." action={{ label: 'Add Semester', onClick: openCreate }} />
      ) : (
        <DataTable<Semester> data={semList} columns={[...COLUMNS, ACTIONS]} searchable={false} stickyHeader
          pagination
        />
      )}

      <AcademicDialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? 'Add Semester' : 'Edit Semester'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Academic session <span className="text-destructive">*</span></label>
            <select value={form.academicSessionId} onChange={upd('academicSessionId')} disabled={saving || dialog?.mode === 'edit'}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">Select session…</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <TextField label="Semester name" value={form.name} onChange={upd('name')} placeholder="e.g. First Semester" required disabled={saving} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Semester number</label>
            <select value={form.number} onChange={upd('number')} disabled={saving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="1">1st Semester</option>
              <option value="2">2nd Semester</option>
              <option value="3">3rd Semester</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start date" type="date" value={form.startDate} onChange={upd('startDate')} required disabled={saving} />
            <TextField label="End date"   type="date" value={form.endDate}   onChange={upd('endDate')}   required disabled={saving} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.current} onChange={upd('current')} disabled={saving}
              className="h-4 w-4 rounded border border-input accent-primary" />
            <span className="text-sm font-medium">Mark as current semester</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create semester' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      <AcademicDialog open={!!deleteTarget} onClose={() => setDelete(null)} title="Delete semester?" size="sm">
        <p className="text-sm text-muted-foreground mb-5">Delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
