import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, BookOpen, Pencil, Trash2, Calendar, Hash,
  GraduationCap, Award, FileText, HelpCircle, ClipboardList,
  Sparkles, X, Check,
} from 'lucide-react'
import { coursesApi, type Course, type CreateCoursePayload } from '@/lib/api/courses.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const LEVELS = ['ND', 'HND', 'BSC', 'MSC', 'MBA', 'PHD', 'PROFESSIONAL']

const LEVEL_COLOR: Record<string, 'default' | 'success' | 'warning'> = {
  ND: 'default', HND: 'default', BSC: 'success',
  MSC: 'success', MBA: 'warning', PHD: 'warning', PROFESSIONAL: 'warning',
}

const LEVEL_LABEL: Record<string, string> = {
  ND: 'National Diploma', HND: 'Higher National Diploma',
  BSC: 'Bachelor of Science', MSC: 'Master of Science',
  MBA: 'Master of Business Admin', PHD: 'Doctor of Philosophy',
  PROFESSIONAL: 'Professional Certification',
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ course, onSave, onCancel, isSaving }: {
  course: Course
  onSave: (data: Partial<CreateCoursePayload>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<CreateCoursePayload>({
    title:        course.title,
    code:         course.code ?? '',
    description:  course.description ?? '',
    level:        course.level,
    credits:      course.credits ?? undefined,
    semester:     course.semester ?? '',
    academicYear: course.academicYear ?? '',
    department:   course.department ?? '',
    faculty:      course.faculty ?? '',
  })

  function set(field: keyof CreateCoursePayload, value: string | number | undefined) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Edit Course</h2>
          <button type="button" onClick={onCancel} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, credits: form.credits ? Number(form.credits) : undefined }) }} className="space-y-4">
          <TextField label="Course Title" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Course Code" value={form.code ?? ''} onChange={(e) => set('code', e.target.value)} />
            <div className="space-y-1">
              <label className="block text-sm font-medium">Level *</label>
              <select value={form.level} onChange={(e) => set('level', e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Credits" type="number" value={form.credits?.toString() ?? ''} onChange={(e) => set('credits', e.target.value ? Number(e.target.value) : undefined)} />
            <TextField label="Semester" value={form.semester ?? ''} onChange={(e) => set('semester', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Department" value={form.department ?? ''} onChange={(e) => set('department', e.target.value)} />
            <TextField label="Faculty" value={form.faculty ?? ''} onChange={(e) => set('faculty', e.target.value)} />
          </div>
          <TextField label="Academic Year" value={form.academicYear ?? ''} onChange={(e) => set('academicYear', e.target.value)} />
          <div className="space-y-1">
            <label className="block text-sm font-medium">Description</label>
            <textarea value={form.description ?? ''} onChange={(e) => set('description', e.target.value)}
              rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} className="px-5">Cancel</Button>
            <Button type="submit" variant="primary" fullWidth loading={isSaving} loadingText="Saving…">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Detail Row ─────────────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | number | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ── Quick Action Button ────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, description, onClick }: {
  icon: React.ElementType; label: string; description: string; onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 text-left hover:bg-muted/60 transition-colors">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [error,   setError]   = useState('')
  const [deleted, setDeleted] = useState(false)

  const { data: course, isLoading, isError } = useQuery<Course>({
    queryKey: ['course', id],
    queryFn:  () => coursesApi.get(id!),
    enabled:  !!id,
    staleTime: 60_000,
  })

  const updateMut = useMutation({
    mutationFn: (payload: Partial<CreateCoursePayload>) => coursesApi.update(id!, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', id] })
      qc.invalidateQueries({ queryKey: ['courses'] })
      setEditing(false)
      setError('')
    },
    onError: (e: unknown) => setError(
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save'
    ),
  })

  const deleteMut = useMutation({
    mutationFn: () => coursesApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      setDeleted(true)
      setTimeout(() => navigate(ROUTES.COURSES), 1500)
    },
    onError: (e: unknown) => setError(
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete'
    ),
  })

  if (deleted) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <Check className="h-6 w-6 text-success" />
        </div>
        <p className="text-sm text-muted-foreground">Course deleted. Redirecting…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      {/* Back link */}
      <button type="button" onClick={() => navigate(ROUTES.COURSES)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Courses
      </button>

      {error && <Alert variant="error" description={error} />}

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-52 rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-28 rounded-2xl" />
              <Skeleton className="h-28 rounded-2xl" />
            </div>
          </div>
        </div>
      ) : isError || !course ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Course not found</p>
          <Button variant="ghost" className="mt-3" onClick={() => navigate(ROUTES.COURSES)}>Go back</Button>
        </div>
      ) : (
        <>
          {/* Hero */}
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{course.title}</h1>
                  <Badge variant={LEVEL_COLOR[course.level] ?? 'default'}>{course.level}</Badge>
                </div>
                {course.code && <p className="mt-0.5 text-sm text-muted-foreground font-mono">{course.code}</p>}
                {course.description && (
                  <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">{course.description}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => { setError(''); setEditing(true) }}>Edit</Button>
              <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => {
                if (window.confirm(`Delete "${course.title}"? This cannot be undone.`)) deleteMut.mutate()
              }} loading={deleteMut.isPending} className="text-error hover:bg-error/10 hover:border-error/30">
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Course info */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Course Information</h2>
                <div className="mt-3">
                  <DetailRow icon={Hash}          label="Course Code"   value={course.code} />
                  <DetailRow icon={GraduationCap} label="Department"    value={course.department} />
                  <DetailRow icon={BookOpen}      label="Faculty"       value={course.faculty} />
                  <DetailRow icon={Award}         label="Credits"       value={course.credits} />
                  <DetailRow icon={Calendar}      label="Semester"      value={course.semester} />
                  <DetailRow icon={Calendar}      label="Academic Year" value={course.academicYear} />
                </div>
                {!course.code && !course.department && !course.faculty && !course.credits && !course.semester && !course.academicYear && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No additional details.{' '}
                    <button type="button" onClick={() => setEditing(true)} className="text-primary hover:underline">
                      Click Edit to add more info.
                    </button>
                  </p>
                )}
              </div>

              {/* AI quick actions */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Generate Content for This Course</h2>
                <p className="mt-0.5 mb-4 text-xs text-muted-foreground">Open an AI generator for this course</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <QuickAction icon={FileText}      label="Lecture Notes"   description="AI-generated lecture content"   onClick={() => navigate(ROUTES.GEN_LECTURE_NOTES)} />
                  <QuickAction icon={HelpCircle}    label="Question Set"    description="MCQs and theory questions"      onClick={() => navigate(ROUTES.GEN_QUIZ)} />
                  <QuickAction icon={ClipboardList} label="Assignment"      description="Structured assignment"          onClick={() => navigate(ROUTES.GEN_ASSIGNMENT)} />
                  <QuickAction icon={Award}         label="Exam Paper"      description="Full exam with marking scheme"  onClick={() => navigate(ROUTES.GEN_EXAM)} />
                  <QuickAction icon={BookOpen}      label="Course Outline"  description="Weekly topic breakdown"         onClick={() => navigate(ROUTES.GEN_COURSE_OUTLINE)} />
                  <QuickAction icon={Sparkles}      label="AI Studio"       description="Open full AI Studio"            onClick={() => navigate(ROUTES.AI_STUDIO)} />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Timestamps */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-3">Timeline</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">{new Date(course.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last updated</span>
                    <span className="font-medium">{new Date(course.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Document count */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold mb-3">Documents</h2>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {(course as unknown as { _count?: { documents?: number } })?._count?.documents ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">documents generated</p>
                  </div>
                </div>
                <Button variant="outline" fullWidth className="mt-4" onClick={() => navigate(ROUTES.DOCUMENT_LIBRARY)}>
                  View in Library
                </Button>
              </div>

              {/* Level badge */}
              <div className={cn('rounded-2xl border border-border bg-card p-5')}>
                <h2 className="text-sm font-semibold mb-2">Academic Level</h2>
                <Badge variant={LEVEL_COLOR[course.level] ?? 'default'} size="lg">{course.level}</Badge>
                <p className="mt-2 text-xs text-muted-foreground">{LEVEL_LABEL[course.level] ?? course.level}</p>
              </div>
            </div>
          </div>
        </>
      )}

      {editing && course && (
        <EditModal
          course={course}
          onSave={(payload) => updateMut.mutate(payload)}
          onCancel={() => { setEditing(false); setError('') }}
          isSaving={updateMut.isPending}
        />
      )}
    </div>
  )
}
