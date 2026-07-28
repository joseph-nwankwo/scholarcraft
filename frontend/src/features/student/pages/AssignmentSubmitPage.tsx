import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, X, FileText, CheckCircle, Loader2, AlertCircle, Clock } from 'lucide-react'
import { submissionApi, type Submission } from '@/lib/api/student.api'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleString()
}

function statusBadge(status: Submission['status']) {
  const map: Record<Submission['status'], { label: string; cls: string }> = {
    DRAFT:     { label: 'Draft',     cls: 'bg-muted text-muted-foreground' },
    SUBMITTED: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    LATE:      { label: 'Late',      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    GRADED:    { label: 'Graded',    cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    RETURNED:  { label: 'Returned',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  }
  const { label, cls } = map[status]
  return <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', cls)}>{label}</span>
}

export default function AssignmentSubmitPage() {
  const { assessmentId }        = useParams<{ assessmentId: string }>()
  const navigate                = useNavigate()
  const fileRef                 = useRef<HTMLInputElement>(null)
  const [sub, setSub]           = useState<Submission | null>(null)
  const [content, setContent]   = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (!assessmentId) return
    submissionApi.get(assessmentId)
      .then((s) => {
        setSub(s)
        if (s?.content) setContent(s.content)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [assessmentId])

  const isLocked = sub?.status === 'SUBMITTED' || sub?.status === 'LATE' || sub?.status === 'GRADED'
  const assessment = sub?.assessment

  async function handleSaveDraft() {
    if (!assessmentId) return
    setSaving(true); setError('')
    try {
      const updated = await submissionApi.saveDraft(assessmentId, content, file ?? undefined)
      setSub(updated)
      setFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }

  async function handleSubmit() {
    if (!assessmentId) return
    if (!confirm('Submit this assignment? You cannot edit it after submission.')) return
    setSubmitting(true); setError('')
    try {
      // Save draft first if there's unsaved content
      if (content || file) await submissionApi.saveDraft(assessmentId, content, file ?? undefined)
      const updated = await submissionApi.submit(assessmentId)
      setSub(updated)
      setFile(null)
    } catch (e) { setError((e as Error).message) }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  if (!sub && error) return (
    <div className="px-6 py-10 text-center">
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
      <p className="text-muted-foreground">{error}</p>
      <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary hover:underline">Go back</button>
    </div>
  )

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <button onClick={() => navigate(ROUTES.STUDENT_COURSES)} className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">
        ← Back to courses
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{assessment?.title ?? 'Assignment'}</h1>
          {assessment?.course && (
            <p className="text-sm text-muted-foreground mt-0.5">{assessment.course.code} · {assessment.course.title}</p>
          )}
        </div>
        {sub && statusBadge(sub.status)}
      </div>

      {/* Assignment info */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <div className="grid sm:grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Marks</span>
            <p className="font-semibold text-foreground">{assessment?.totalMarks ?? '—'}</p>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</span>
            <p className={cn('font-semibold', assessment?.dueDate && new Date(assessment.dueDate) < new Date() ? 'text-red-600' : 'text-foreground')}>
              <Clock className="inline h-3.5 w-3.5 mr-1" />
              {fmtDate(assessment?.dueDate) ?? 'No deadline'}
            </p>
          </div>
        </div>
        {assessment?.description && (
          <p className="text-sm text-muted-foreground border-t border-border pt-3">{assessment.description}</p>
        )}
        {assessment?.instructions && (
          <div className="border-t border-border pt-3 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Instructions</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{assessment.instructions}</p>
          </div>
        )}
      </div>

      {/* Graded feedback */}
      {(sub?.status === 'GRADED' || sub?.status === 'RETURNED') && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-5 mb-5">
          <p className="font-semibold text-green-800 dark:text-green-300 mb-1">
            {sub.status === 'GRADED' ? `Grade: ${sub.grade} / ${assessment?.totalMarks}` : 'Returned for revision'}
          </p>
          {sub.feedback && <p className="text-sm text-green-700 dark:text-green-400">{sub.feedback}</p>}
          {sub.gradedAt && <p className="text-xs text-muted-foreground mt-1">Graded {fmtDate(sub.gradedAt)}</p>}
        </div>
      )}

      {/* Submission area */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-3">Your Submission</p>

        {/* Existing file */}
        {sub?.fileUrl && !file && (
          <div className="flex items-center gap-2 mb-3 text-sm bg-muted/40 rounded-lg px-3 py-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="truncate text-foreground">{sub.fileName ?? 'Uploaded file'}</span>
            {!isLocked && (
              <button onClick={() => fileRef.current?.click()} className="ml-auto text-xs text-primary hover:underline shrink-0">
                Replace
              </button>
            )}
          </div>
        )}

        {/* Text area */}
        {!isLocked && (
          <>
            <textarea
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your answer here… (or upload a file below)"
              className="w-full text-sm border border-input rounded-lg p-3 bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {/* File upload */}
            <div
              onClick={() => fileRef.current?.click()}
              className="mt-3 border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-1.5 cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">
                {file ? file.name : 'Click to upload a file (PDF, DOCX, images · max 20 MB)'}
              </p>
              {file && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="text-xs text-red-500 hover:underline flex items-center gap-0.5">
                  <X className="h-3 w-3" /> Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.zip,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </>
        )}

        {isLocked && (
          <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
            {sub?.content ? (
              <p className="whitespace-pre-wrap text-foreground">{sub.content}</p>
            ) : (
              <p>File submitted: {sub?.fileName ?? 'See uploaded file'}</p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {!isLocked && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => void handleSaveDraft()}
              disabled={saving || submitting}
              className="flex items-center gap-1.5 text-sm border border-border rounded-lg px-4 py-2 hover:bg-muted/30 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : null}
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Draft'}
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={saving || submitting || (!content && !file && !sub?.fileUrl)}
              className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {submitting ? 'Submitting…' : 'Submit Assignment'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
