import { useState, useCallback } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  courseApi, departmentApi, sessionApi,
  type Course, type Department, type Semester,
  type CourseLevel, type CourseType, type DeliveryMode,
} from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { DataTable, type Column } from '@/components/design-system/data/DataTable'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { ROUTES, buildRoute } from '@/constants/routes'

interface FormState {
  departmentId: string; semesterId: string; code: string; title: string; description: string
  creditUnits: string; level: CourseLevel; courseType: CourseType; deliveryMode: DeliveryMode; learningHours: string
}
const EMPTY: FormState = {
  departmentId: '', semesterId: '', code: '', title: '', description: '',
  creditUnits: '3', level: 'L100', courseType: 'COMPULSORY', deliveryMode: 'FACE_TO_FACE', learningHours: '',
}

const LEVEL_OPTS: CourseLevel[]    = ['L100','L200','L300','L400','L500','L600','L700','POSTGRADUATE']
const TYPE_OPTS: CourseType[]      = ['COMPULSORY','ELECTIVE','GENERAL']
const DELIVERY_OPTS: DeliveryMode[] = ['FACE_TO_FACE','ONLINE','HYBRID']

const COURSE_COLUMNS: Column<Course>[] = [
  {
    key: 'code',
    header: 'Course',
    sortable: true,
    cell: (c) => (
      <div>
        <p className="font-mono text-xs font-medium text-primary">{c.code}</p>
        <p className="font-medium text-foreground text-sm">{c.title}</p>
      </div>
    ),
  },
  {
    key: 'department',
    header: 'Department',
    cell: (c) => (
      <div>
        <p className="text-sm text-foreground">{c.department?.name ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{c.department?.faculty?.name ?? ''}</p>
      </div>
    ),
  },
  {
    key: 'level',
    header: 'Level',
    cell: (c) => <Badge variant="default" size="sm">{c.level}</Badge>,
  },
  {
    key: 'courseType',
    header: 'Type',
    cell: (c) => (
      <Badge variant={c.courseType === 'COMPULSORY' ? 'error' : c.courseType === 'ELECTIVE' ? 'success' : 'default'} size="sm">
        {c.courseType}
      </Badge>
    ),
  },
  {
    key: 'creditUnits',
    header: 'Credits',
    cell: (c) => <span className="text-sm font-medium text-foreground">{c.creditUnits} CU</span>,
  },
  {
    key: 'active',
    header: 'Status',
    cell: (c) => c.active
      ? <Badge variant="success" size="sm">Active</Badge>
      : <Badge variant="default" size="sm">Inactive</Badge>,
  },
]

export default function AcademicCoursesPage() {
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [page]                    = useState(1)
  const [selected, setSelected]   = useState<string[]>([])
  const [dialog, setDialog]       = useState<{ mode: 'create' | 'edit'; course?: Course } | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [deleteTarget, setDelete] = useState<Course | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => courseApi.list({ search: search || undefined, departmentId: deptFilter || undefined, level: levelFilter || undefined, page, limit: 20 }),
    [search, deptFilter, levelFilter, page]
  )
  const { data: deptData }    = useAsync(() => departmentApi.list({ limit: 200 }), [])
  const { data: semData }     = useAsync(() => sessionApi.listSemesters(), [])

  const departments: Department[] = deptData?.data ?? []
  const semesters: Semester[]     = semData?.data ?? []
  const courses: Course[]         = data?.data ?? []

  function upd<K extends keyof FormState>(field: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value as FormState[K] }))
  }

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY, departmentId: deptFilter })
    setFormErr(''); setDialog({ mode: 'create' })
  }, [deptFilter])

  const openEdit = useCallback((c: Course) => {
    setForm({
      departmentId: c.departmentId, semesterId: c.semesterId ?? '', code: c.code,
      title: c.title, description: c.description ?? '', creditUnits: String(c.creditUnits),
      level: c.level, courseType: c.courseType, deliveryMode: c.deliveryMode,
      learningHours: c.learningHours != null ? String(c.learningHours) : '',
    })
    setFormErr(''); setDialog({ mode: 'edit', course: c })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.departmentId || !form.code || !form.title) { setFormErr('Department, code, and title are required'); return }
    setSaving(true); setFormErr('')
    try {
      const payload = {
        ...form,
        creditUnits: parseInt(form.creditUnits) || 3,
        learningHours: form.learningHours ? parseInt(form.learningHours) : undefined,
        semesterId: form.semesterId || undefined,
      }
      if (dialog?.mode === 'create') await courseApi.create(payload)
      else await courseApi.update(dialog!.course!.id, payload)
      setDialog(null); reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await courseApi.delete(deleteTarget.id); setDelete(null); reload() } catch { /**/ }
  }

  async function handleBulkDelete() {
    if (!selected.length) return
    try { await courseApi.bulkDelete(selected); setSelected([]); reload() } catch { /**/ }
  }

  async function toggleActive(c: Course) {
    try { await courseApi.update(c.id, { active: !c.active }); reload() } catch { /**/ }
  }

  const ACTIONS: Column<Course> = {
    key: 'id', header: '',
    cell: (c) => (
      <div className="flex items-center justify-end gap-1">
        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />} onClick={() => navigate(buildRoute(ROUTES.ACADEMIC_COURSE_DETAIL, { id: c.id }))} />
        <Button variant="ghost" size="sm" leftIcon={c.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />} onClick={() => toggleActive(c)} />
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEdit(c)} />
        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setDelete(c)} className="text-destructive hover:text-destructive" />
      </div>
    ),
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Courses
          </h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} courses registered</p>
        </div>
        <div className="flex gap-2">
          {selected.length > 0 && (
            <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={handleBulkDelete}>
              Delete {selected.length} selected
            </Button>
          )}
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Course</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <TextField placeholder="Search courses…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All levels</option>
          {LEVEL_OPTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : courses.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-6 w-6" />} title="No courses found" description="Add courses to your departments and programmes." action={{ label: 'Add Course', onClick: openCreate }} />
      ) : (
        <DataTable<Course>
          data={courses} columns={[...COURSE_COLUMNS, ACTIONS]} searchable={false} stickyHeader
          selectable
          pagination
        />
      )}

      {/* Create/Edit Dialog */}
      <AcademicDialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? 'Add Course' : 'Edit Course'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Department <span className="text-destructive">*</span></label>
            <select value={form.departmentId} onChange={upd('departmentId')} disabled={saving}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            >
              <option value="">Select department…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField label="Course code" value={form.code} onChange={upd('code')} placeholder="CSC 301" required disabled={saving} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Semester (optional)</label>
              <select value={form.semesterId} onChange={upd('semesterId')} disabled={saving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">No semester</option>
                {semesters.map((s) => <option key={s.id} value={s.id}>{s.name} – {s.academicSession?.name}</option>)}
              </select>
            </div>
          </div>

          <TextField label="Course title" value={form.title} onChange={upd('title')} placeholder="Introduction to Computer Science" required disabled={saving} />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea value={form.description} onChange={upd('description')} disabled={saving} rows={3}
              placeholder="Brief course overview…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <TextField label="Credit units" type="number" value={form.creditUnits} onChange={upd('creditUnits')} disabled={saving} />
            <TextField label="Learning hours" type="number" value={form.learningHours} onChange={upd('learningHours')} placeholder="Optional" disabled={saving} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Level</label>
              <select value={form.level} onChange={upd('level')} disabled={saving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {LEVEL_OPTS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select value={form.courseType} onChange={upd('courseType')} disabled={saving}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                {TYPE_OPTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Delivery mode</label>
            <div className="flex gap-3">
              {DELIVERY_OPTS.map((d) => (
                <label key={d} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="radio" name="delivery" value={d} checked={form.deliveryMode === d} onChange={upd('deliveryMode')} disabled={saving} className="accent-primary" />
                  {d.replace('_', ' ')}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create course' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      <AcademicDialog open={!!deleteTarget} onClose={() => setDelete(null)} title="Delete course?" size="sm">
        <p className="text-sm text-muted-foreground mb-5">
          Delete <strong>{deleteTarget?.code} – {deleteTarget?.title}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
