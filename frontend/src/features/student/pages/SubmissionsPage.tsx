import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Loader2, AlertCircle, Filter } from 'lucide-react'
import { submissionApi, type Submission } from '@/lib/api/student.api'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | Submission['status']

const STATUS_OPTS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL',       label: 'All' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'LATE',      label: 'Late' },
  { value: 'GRADED',    label: 'Graded' },
  { value: 'RETURNED',  label: 'Returned' },
]

function statusStyle(s: Submission['status']) {
  switch (s) {
    case 'GRADED':    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'SUBMITTED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'LATE':      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'RETURNED':  return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    default:          return 'bg-muted text-muted-foreground'
  }
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SubmissionsPage() {
  const [subs, setSubs]         = useState<Submission[]>([])
  const [filter, setFilter]     = useState<StatusFilter>('ALL')
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    submissionApi.getMy()
      .then(setSubs)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL' ? subs : subs.filter((s) => s.status === filter)

  return (
    <>
      <div className="px-6 py-5 border-b border-border bg-background">
        <h1 className="text-lg font-semibold text-foreground">My Submissions</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track all your assignment submissions and grades</p>
      </div>

      <div className="px-6 py-5 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {STATUS_OPTS.map((o) => (
            <button key={o.value}
              onClick={() => setFilter(o.value)}
              className={cn(
                'text-xs px-3 py-1 rounded-full border transition-colors',
                filter === o.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground',
              )}>
              {o.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">No submissions yet</p>
            <Link to={ROUTES.STUDENT_COURSES} className="mt-2 text-sm text-primary hover:underline block">
              Go to My Courses to find assignments
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const pct = s.grade != null && s.assessment?.totalMarks
                ? Math.round((s.grade / s.assessment.totalMarks) * 100)
                : null

              return (
                <div key={s.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={ROUTES.STUDENT_ASSIGNMENT.replace(':assessmentId', s.assessmentId)}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {s.assessment?.title ?? 'Assignment'}
                      </Link>
                      {s.assessment?.course && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.assessment.course.code} · {s.assessment.course.title}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium shrink-0', statusStyle(s.status))}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground/60 uppercase tracking-wide text-[10px] mb-0.5">Submitted</span>
                      {fmt(s.submittedAt)}
                    </div>
                    <div>
                      <span className="block font-medium text-foreground/60 uppercase tracking-wide text-[10px] mb-0.5">Due</span>
                      {fmt(s.assessment?.dueDate ?? null)}
                    </div>
                    <div>
                      <span className="block font-medium text-foreground/60 uppercase tracking-wide text-[10px] mb-0.5">Grade</span>
                      {s.grade != null
                        ? <span className="font-semibold text-foreground">{s.grade}/{s.assessment?.totalMarks} ({pct}%)</span>
                        : '—'}
                    </div>
                  </div>

                  {s.feedback && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Feedback</p>
                      <p className="text-sm text-foreground">{s.feedback}</p>
                    </div>
                  )}

                  {s.status === 'DRAFT' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <Link
                        to={ROUTES.STUDENT_ASSIGNMENT.replace(':assessmentId', s.assessmentId)}
                        className="text-xs text-primary hover:underline"
                      >
                        Continue draft →
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
