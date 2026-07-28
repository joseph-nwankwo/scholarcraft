import { useState, useCallback } from 'react'
import { GraduationCap, Plus, Pencil, Trash2 } from 'lucide-react'
import { programmeApi, departmentApi, type Programme, type Department } from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { DataTable, type Column } from '@/components/design-system/data/DataTable'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

type StudyMode      = 'FULL_TIME' | 'PART_TIME' | 'DISTANCE' | 'BLENDED'
type AccreditStatus = 'PENDING' | 'ACCREDITED' | 'PROVISIONAL' | 'REVOKED'

interface FormState {
  departmentId: string; name: string; abbreviation: string; degree: string
  duration: string; studyMode: StudyMode; accreditationStatus: AccreditStatus
}
const EMPTY: FormState = {
  departmentId: '', name: '', abbreviation: '', degree: '',
  duration: '4', studyMode: 'FULL_TIME', accreditationStatus: 'PENDING',
}

const ACCREDIT_BADGE: Record<AccreditStatus, 'success' | 'warning' | 'error' | 'default'> = {
  ACCREDITED: 'success', PROVISIONAL: 'warning', REVOKED: 'error', PENDING: 'default',
}

const COLUMNS: Column<Programme>[] = [
  {
    key: 'name',
    header: 'Programme',
    sortable: true,
    cell: (p) => (
      <div>
        <p className="font-medium text-foreground">{p.name}</p>
        <p className="text-xs text-muted-foreground">{p.abbreviation ?? p.degree} · {p.duration} yr{p.duration !== 1 ? 's' : ''}</p>
      </div>
    ),
  },
  {
    key: 'department',
    header: 'Department / Faculty',
    cell: (p) => (
      <div>
        <p className="text-sm text-foreground">{p.department?.name ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{p.department?.faculty?.name ?? ''}</p>
      </div>
    ),
  },
  {
    key: 'studyMode',
    header: 'Mode',
    cell: (p) => <Badge variant="default" size="sm">{p.studyMode.replace('_', ' ')}</Badge>,
  },
  {
    key: 'accreditationStatus',
    header: 'Accreditation',
    cell: (p) => <Badge variant={ACCREDIT_BADGE[p.accreditationStatus]} size="sm">{p.accreditationStatus}</Badge>,
  },
  {
    key: '_count',
    header: 'Courses',
    cell: (p) => <span className="text-sm text-muted-foreground">{p._count?.courses ?? 0}</span>,
  },
]

export default function ProgrammePage() {
  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [dialog, setDialog]       = useState<{ mode: 'create' | 'edit'; prog?: Programme } | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [deleteTarget, setDelete] = useState<Programme | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => programmeApi.list({ search: search || undefined, departmentId: deptFilter || undefined, limit: 50 }),
    [search, deptFilter]
  )
  const { data: deptData } = useAsync(() => departmentApi.list({ limit: 200 }), [])
  const departments: Department[] = deptData?.data ?? []
  const programmes: Programme[]   = data?.data ?? []

  // Group departments by faculty for the select
  const deptsByFaculty = departments.reduce<Record<string, { faculty: string; depts: Department[] }>>((acc, d) => {
    const fid = d.facultyId
    if (!acc[fid]) acc[fid] = { faculty: d.faculty?.name ?? fid, depts: [] }
    acc[fid].depts.push(d)
    return acc
  }, {})

  function upd<K extends keyof FormState>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value as FormState[K] }))
  }

  const openCreate = useCallback(() => { setForm(EMPTY); setFormErr(''); setDialog({ mode: 'create' }) }, [])
  const openEdit = useCallback((p: Programme) => {
    setForm({
      departmentId: p.departmentId, name: p.name, abbreviation: p.abbreviation ?? '',
      degree: p.degree, duration: String(p.duration), studyMode: p.studyMode,
      accreditationStatus: p.accreditationStatus,
    })
    setFormErr(''); setDialog({ mode: 'edit', prog: p })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.departmentId || !form.name || !form.degree) { setFormErr('Department, name, and degree are required'); return }
    setSaving(true); setFormErr('')
    try {
      const payload = { ...form, duration: parseInt(form.duration) || 4 }
      if (dialog?.mode === 'create') await programmeApi.create(payload)
      else await programmeApi.update(dialog!.prog!.id, payload)
      setDialog(null); reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await programmeApi.delete(deleteTarget.id); setDelete(null); reload() } catch { /**/ }
  }

  const ACTIONS: Column<Programme> = {
    key: 'id', header: '',
    cell: (p) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(p)} />
        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDelete(p)} className="text-destructive hover:text-destructive" />
      </div>
    ),
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Programmes
          </h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} academic programmes</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Programme</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <TextField placeholder="Search programmes…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : programmes.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No programmes yet" description="Add degree programmes to your departments." action={{ label: 'Add Programme', onClick: openCreate }} />
      ) : (
        <DataTable<Programme> data={programmes} columns={[...COLUMNS, ACTIONS]} searchable={false} stickyHeader
          pagination
        />
      )}

      {/* Form dialog */}
      <AcademicDialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? 'Add Programme' : 'Edit Programme'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
            <select value={form.departmentId} onChange={upd('departmentId')} disabled={saving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">Select department…</option>
              {Object.entries(deptsByFaculty).map(([, { faculty, depts }]) => (
                <optgroup key={faculty} label={faculty}>
                  {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <TextField label="Programme name" value={form.name} onChange={upd('name')} placeholder="e.g. Computer Science" required disabled={saving} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Abbreviation" value={form.abbreviation} onChange={upd('abbreviation')} placeholder="B.Sc. CS" disabled={saving} />
            <TextField label="Degree" value={form.degree} onChange={upd('degree')} placeholder="B.Sc." required disabled={saving} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Duration (years)" type="number" value={form.duration} onChange={upd('duration')} disabled={saving} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Study mode</label>
              <select value={form.studyMode} onChange={upd('studyMode')} disabled={saving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {(['FULL_TIME', 'PART_TIME', 'DISTANCE', 'BLENDED'] as const).map((m) => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Accreditation</label>
              <select value={form.accreditationStatus} onChange={upd('accreditationStatus')} disabled={saving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {(['PENDING', 'ACCREDITED', 'PROVISIONAL', 'REVOKED'] as const).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create programme' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      <AcademicDialog open={!!deleteTarget} onClose={() => setDelete(null)} title="Delete programme?" size="sm">
        <p className="text-sm text-muted-foreground mb-5">Delete <strong>{deleteTarget?.name}</strong>?</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
