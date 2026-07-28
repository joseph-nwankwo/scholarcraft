import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { coursesApi, type CreateCoursePayload } from '@/lib/api/courses.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'

const LEVELS = ['ND', 'HND', 'BSC', 'MSC', 'MBA', 'PHD', 'PROFESSIONAL']

const EMPTY: CreateCoursePayload = {
  title:        '',
  code:         '',
  description:  '',
  level:        'BSC',
  credits:      undefined,
  semester:     '',
  academicYear: '',
  department:   '',
  faculty:      '',
}

export default function CreateCoursePage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [form,  setForm]  = useState<CreateCoursePayload>(EMPTY)
  const [error, setError] = useState('')

  function set(field: keyof CreateCoursePayload, value: string | number | undefined) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  const createMut = useMutation({
    mutationFn: (payload: CreateCoursePayload) => coursesApi.create(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      const id = (res as { course?: { id?: string } })?.course?.id
      navigate(id ? `/courses/${id}` : ROUTES.COURSES)
    },
    onError: (e: unknown) => {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create course'
      )
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setError('')
    createMut.mutate({ ...form, credits: form.credits ? Number(form.credits) : undefined })
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(ROUTES.COURSES)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Back to courses"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Create Course</h1>
          <p className="text-sm text-muted-foreground">Add a new course to your teaching portfolio</p>
        </div>
      </div>

      {error && <Alert variant="error" description={error} />}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">Course Details</p>
            <p className="text-xs text-muted-foreground">Fill in the information below</p>
          </div>
        </div>

        <hr className="border-border" />

        <TextField
          label="Course Title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Introduction to Computer Science"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Course Code"
            value={form.code ?? ''}
            onChange={(e) => set('code', e.target.value)}
            placeholder="e.g. CS 101"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-foreground">
              Level <span className="text-error">*</span>
            </label>
            <select
              value={form.level}
              onChange={(e) => set('level', e.target.value)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Credits"
            type="number"
            value={form.credits?.toString() ?? ''}
            onChange={(e) => set('credits', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 3"
          />
          <TextField
            label="Semester"
            value={form.semester ?? ''}
            onChange={(e) => set('semester', e.target.value)}
            placeholder="e.g. First"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Department"
            value={form.department ?? ''}
            onChange={(e) => set('department', e.target.value)}
            placeholder="e.g. Computer Science"
          />
          <TextField
            label="Faculty"
            value={form.faculty ?? ''}
            onChange={(e) => set('faculty', e.target.value)}
            placeholder="e.g. Engineering"
          />
        </div>

        <TextField
          label="Academic Year"
          value={form.academicYear ?? ''}
          onChange={(e) => set('academicYear', e.target.value)}
          placeholder="e.g. 2024/2025"
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-foreground">Description (optional)</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="A brief overview of this course…"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(ROUTES.COURSES)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" fullWidth loading={createMut.isPending} loadingText="Creating…">
            Create Course
          </Button>
        </div>
      </form>
    </div>
  )
}
