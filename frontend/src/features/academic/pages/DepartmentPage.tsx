import { useState, useCallback } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Filter } from 'lucide-react'
import { departmentApi, facultyApi, type Department, type Faculty } from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { DataTable, type Column } from '@/components/design-system/data/DataTable'

interface FormState { facultyId: string; name: string; code: string; abbreviation: string; description: string }
const EMPTY: FormState = { facultyId: '', name: '', code: '', abbreviation: '', description: '' }

const COLUMNS: Column<Department>[] = [
  {
    key: 'name',
    header: 'Department',
    sortable: true,
    cell: (d) => (
      <div>
        <p className="font-medium text-foreground">{d.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{d.code}</p>
      </div>
    ),
  },
  {
    key: 'faculty',
    header: 'Faculty',
    cell: (d) => <span className="text-sm text-muted-foreground">{d.faculty?.name ?? '—'}</span>,
  },
  {
    key: 'hod',
    header: 'HOD',
    cell: (d) => <span className="text-sm text-muted-foreground">{d.hod?.name ?? '—'}</span>,
  },
  {
    key: '_count',
    header: 'Courses / Programmes',
    cell: (d) => (
      <div className="flex gap-2">
        <Badge variant="default" size="sm">{d._count?.courses ?? 0} courses</Badge>
        <Badge variant="default" size="sm">{d._count?.programmes ?? 0} prog.</Badge>
      </div>
    ),
  },
]

export default function DepartmentPage() {
  const [search, setSearch]     = useState('')
  const [facultyFilter, setFacultyFilter] = useState('')
  const [dialog, setDialog]     = useState<{ mode: 'create' | 'edit'; dept?: Department } | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [formErr, setFormErr]   = useState('')
  const [deleteTarget, setDelete] = useState<Department | null>(null)

  const { data: deptData, loading, error, reload } = useAsync(
    () => departmentApi.list({ search: search || undefined, facultyId: facultyFilter || undefined, limit: 50 }),
    [search, facultyFilter]
  )
  const { data: facData } = useAsync(() => facultyApi.list({ limit: 100 }), [])

  const faculties: Faculty[] = facData?.data ?? []
  const departments: Department[] = deptData?.data ?? []

  function upd(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY, facultyId: facultyFilter || (faculties[0]?.id ?? '') })
    setFormErr(''); setDialog({ mode: 'create' })
  }, [facultyFilter, faculties])

  const openEdit = useCallback((d: Department) => {
    setForm({ facultyId: d.facultyId, name: d.name, code: d.code, abbreviation: d.abbreviation ?? '', description: d.description ?? '' })
    setFormErr(''); setDialog({ mode: 'edit', dept: d })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.facultyId || !form.name || !form.code) { setFormErr('Faculty, name, and code are required'); return }
    setSaving(true); setFormErr('')
    try {
      if (dialog?.mode === 'create') await departmentApi.create({ ...form, code: form.code.toUpperCase() })
      else await departmentApi.update(dialog!.dept!.id, { ...form, code: form.code.toUpperCase() })
      setDialog(null); reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await departmentApi.delete(deleteTarget.id); setDelete(null); reload() } catch { /**/ }
  }

  const ACTIONS: Column<Department> = {
    key: 'id',
    header: '',
    cell: (d) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(d)} />
        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDelete(d)} className="text-destructive hover:text-destructive" />
      </div>
    ),
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Departments
          </h1>
          <p className="text-sm text-muted-foreground">{deptData?.total ?? 0} departments</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Department</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <TextField placeholder="Search departments…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All faculties</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : departments.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No departments yet" description="Add departments to your faculties." action={{ label: 'Add Department', onClick: openCreate }} />
      ) : (
        <DataTable<Department>
          data={departments}
          columns={[...COLUMNS, ACTIONS]}
          searchable={false}
          stickyHeader
          pagination
        />
      )}

      {/* Create/Edit */}
      <AcademicDialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? 'Add Department' : 'Edit Department'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Faculty <span className="text-destructive">*</span></label>
            <select value={form.facultyId} onChange={upd('facultyId')} disabled={saving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">Select faculty…</option>
              {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <TextField label="Department name" value={form.name} onChange={upd('name')} placeholder="e.g. Department of Computer Science" required disabled={saving} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" value={form.code} onChange={upd('code')} placeholder="CSC" required disabled={saving} />
            <TextField label="Abbreviation" value={form.abbreviation} onChange={upd('abbreviation')} placeholder="DCS" disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea rows={2} value={form.description} onChange={upd('description')} disabled={saving}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create department' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      {/* Delete */}
      <AcademicDialog open={!!deleteTarget} onClose={() => setDelete(null)} title="Delete department?" size="sm">
        <p className="text-sm text-muted-foreground mb-5">
          Delete <strong>{deleteTarget?.name}</strong>? This action is reversible by your system administrator.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
