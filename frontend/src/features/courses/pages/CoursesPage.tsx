import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BookOpen, Plus, Search, X, MoreHorizontal,
  GraduationCap, Calendar, Hash, Pencil, Trash2,
} from 'lucide-react'
import { coursesApi, type Course, type CreateCoursePayload } from '@/lib/api/courses.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { Badge } from '@/components/design-system/display/Badge'
import { ROUTES, buildRoute } from '@/constants/routes'

const LEVELS = ['ND', 'HND', 'BSC', 'MSC', 'MBA', 'PHD', 'PROFESSIONAL']

const LEVEL_COLOR: Record<string, 'default' | 'success' | 'warning'> = {
  ND: 'default', HND: 'default', BSC: 'success',
  MSC: 'success', MBA: 'warning', PHD: 'warning', PROFESSIONAL: 'warning',
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
interface CourseFormProps {
  initial?: Partial<CreateCoursePayload>
  onSave: (data: CreateCoursePayload) => void
  onCancel: () => void
  isSaving: boolean
}

function CourseForm({ initial, onSave, onCancel, isSaving }: CourseFormProps) {
  const [form, setForm] = useState<CreateCoursePayload>({
    title:       initial?.title       ?? '',
    code:        initial?.code        ?? '',
    description: initial?.description ?? '',
    level:       initial?.level       ?? 'BSC',
    credits:     initial?.credits     ?? undefined,
    semester:    initial?.semester    ?? '',
    academicYear:initial?.academicYear?? '',
    department:  initial?.department  ?? '',
    faculty:     initial?.faculty     ?? '',
  })

  function set(field: keyof CreateCoursePayload, value: string | number) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.level) return
    onSave({ ...form, credits: form.credits ? Number(form.credits) : undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold">{initial ? 'Edit Course' : 'Create Course'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField label="Course Title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Introduction to Algorithms" required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Course Code" value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} placeholder="CS 301" />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-foreground">Level <span className="text-error">*</span></label>
              <select
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Credits" type="number" value={form.credits?.toString() ?? ''} onChange={(e) => set('credits', e.target.value)} placeholder="3" />
            <TextField label="Semester" value={form.semester ?? ''} onChange={(e) => set('semester', e.target.value)} placeholder="First" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Department" value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} placeholder="Computer Science" />
            <TextField label="Faculty" value={form.faculty ?? ''} onChange={(e) => set('faculty', e.target.value)} placeholder="Engineering" />
          </div>
          <TextField label="Academic Year" value={form.academicYear ?? ''} onChange={(e) => set('academicYear', e.target.value)} placeholder="2024/2025" />
          <TextField label="Description (optional)" value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="A brief course description…" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-none px-5">Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={isSaving} loadingText="Saving…">
              {initial ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Course Card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onDelete }: { course: Course; onEdit: () => void; onDelete: () => void }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className="group relative flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => navigate(buildRoute(ROUTES.COURSE_DETAIL, { id: course.id }))}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
          className="rounded-lg p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          aria-label="Course actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menuOpen && (
          <div
            className="absolute right-3 top-10 z-10 w-36 rounded-lg border border-border bg-card py-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onEdit() }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onDelete() }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-error hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{course.title}</p>
        {course.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{course.description}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {course.code && (
          <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{course.code}</span>
        )}
        {course.department && (
          <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{course.department}</span>
        )}
        {course.semester && (
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{course.semester}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Badge variant={LEVEL_COLOR[course.level] ?? 'default'} size="sm">{course.level}</Badge>
        {course.credits && <span className="text-xs text-muted-foreground">{course.credits} credit{course.credits !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const qc       = useQueryClient()
  const [search, setSearch]     = useState('')
  const [page,   setPage]       = useState(1)
  const [showCreate, setCreate] = useState(false)
  const [editing,    setEditing] = useState<Course | null>(null)
  const [error,      setError]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['courses', page, search],
    queryFn: () => coursesApi.list({ page, pageSize: 12, search } as never),
    staleTime: 30_000,
  })

  const courses    = (data as { data?: Course[] })?.data ?? []
  const total      = (data as { total?: number })?.total ?? 0
  const totalPages = Math.ceil(total / 12)

  const createMut = useMutation({
    mutationFn: (payload: CreateCoursePayload) => coursesApi.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setCreate(false); setError('') },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create course'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateCoursePayload> }) => coursesApi.update(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['courses'] }); setEditing(null); setError('') },
    onError: (e: unknown) => setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update course'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => coursesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['courses'] }),
  })

  return (
    <div className="mx-auto max-w-350 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total > 0 ? `${total} course${total !== 1 ? 's' : ''}` : 'No courses yet'}
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setError(''); setCreate(true) }}>
          New Course
        </Button>
      </div>

      {error && <Alert variant="error" description={error} />}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search courses…"
          className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(1) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-medium text-foreground">{search ? 'No courses match your search' : 'No courses yet'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try a different search term' : 'Create your first course to get started'}
          </p>
          {!search && (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} className="mt-5" onClick={() => { setError(''); setCreate(true) }}>
              Create Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onEdit={() => { setError(''); setEditing(c) }}
              onDelete={() => { if (window.confirm(`Delete "${c.title}"?`)) deleteMut.mutate(c.id) }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CourseForm
          onSave={(payload) => createMut.mutate(payload)}
          onCancel={() => { setCreate(false); setError('') }}
          isSaving={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editing && (
        <CourseForm
          initial={editing as Partial<CreateCoursePayload>}
          onSave={(payload) => updateMut.mutate({ id: editing.id, payload })}
          onCancel={() => { setEditing(null); setError('') }}
          isSaving={updateMut.isPending}
        />
      )}
    </div>
  )
}
