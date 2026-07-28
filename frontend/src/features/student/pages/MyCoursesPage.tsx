import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Plus, Loader2, Search, AlertCircle } from 'lucide-react'
import { enrollmentApi, type CourseBasic, type EnrolledCourse } from '@/lib/api/student.api'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

type Tab = 'enrolled' | 'available'

function levelLabel(l: string) {
  return l.replace('_', ' ').replace('L', 'Level ')
}

export default function MyCoursesPage() {
  const [tab, setTab]               = useState<Tab>('enrolled')
  const [enrolled, setEnrolled]     = useState<EnrolledCourse[]>([])
  const [available, setAvailable]   = useState<(CourseBasic & { enrolled: boolean })[]>([])
  const [loading, setLoading]       = useState(true)
  const [enrolling, setEnrolling]   = useState<string | null>(null)
  const [dropping, setDropping]     = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [error, setError]           = useState('')

  async function load() {
    setLoading(true)
    try {
      const [e, a] = await Promise.all([enrollmentApi.getMy(), enrollmentApi.getAvailable()])
      setEnrolled(e)
      setAvailable(a)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  async function handleEnroll(courseId: string) {
    setEnrolling(courseId)
    try {
      await enrollmentApi.enroll(courseId)
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setEnrolling(null) }
  }

  async function handleDrop(courseId: string) {
    if (!confirm('Drop this course?')) return
    setDropping(courseId)
    try {
      await enrollmentApi.drop(courseId)
      await load()
    } catch (e) { setError((e as Error).message) }
    finally { setDropping(null) }
  }

  const filteredEnrolled  = enrolled.filter((c) =>
    `${c.title} ${c.code}`.toLowerCase().includes(search.toLowerCase()))
  const filteredAvailable = available.filter((c) =>
    `${c.title} ${c.code}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="px-6 py-5 border-b border-border bg-background">
        <h1 className="text-lg font-semibold text-foreground">My Courses</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Browse and manage your course enrollments</p>
      </div>

      <div className="px-6 py-5 max-w-5xl mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
          <div className="flex gap-0 border-b border-border">
            {(['enrolled', 'available'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn(
                  'px-5 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors',
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {t === 'enrolled' ? `Enrolled (${enrolled.length})` : `Available (${available.filter((c) => !c.enrolled).length})`}
              </button>
            ))}
          </div>
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="pl-8 pr-3 py-1.5 text-sm border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-52"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === 'enrolled' ? (
          filteredEnrolled.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">Not enrolled in any courses yet</p>
              <button onClick={() => setTab('available')} className="mt-2 text-sm text-primary hover:underline">
                Browse available courses
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredEnrolled.map((c) => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{c.title}</p>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{c.code}</span>
                    </div>
                    {c.department?.name && (
                      <p className="text-xs text-muted-foreground mt-1">{c.department.name} · {levelLabel(c.level)} · {c.creditUnits} units</p>
                    )}
                    {c.assignments?.[0]?.lecturer && (
                      <p className="text-xs text-muted-foreground">Lecturer: {c.assignments[0].lecturer.name}</p>
                    )}
                  </div>
                  {(c.assessments?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Open Assignments</p>
                      <ul className="space-y-1">
                        {c.assessments!.map((a) => (
                          <li key={a.id}>
                            <Link
                              to={ROUTES.STUDENT_ASSIGNMENT.replace(':assessmentId', a.id)}
                              className="flex items-center justify-between text-sm hover:text-primary transition-colors"
                            >
                              <span className="truncate">{a.title}</span>
                              {a.dueDate && (
                                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                  {new Date(a.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={() => void handleDrop(c.id)}
                    disabled={dropping === c.id}
                    className="mt-auto text-xs text-muted-foreground hover:text-red-600 transition-colors self-end"
                  >
                    {dropping === c.id ? 'Dropping…' : 'Drop course'}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredAvailable.filter((c) => !c.enrolled).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">You're enrolled in all available courses!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredAvailable.filter((c) => !c.enrolled).map((c) => (
                <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-foreground">{c.title}</p>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">{c.code}</span>
                    </div>
                    {c.department?.name && (
                      <p className="text-xs text-muted-foreground mt-1">{c.department.name} · {levelLabel(c.level)} · {c.creditUnits} units</p>
                    )}
                    {c.assignments?.[0]?.lecturer && (
                      <p className="text-xs text-muted-foreground">Lecturer: {c.assignments[0].lecturer.name}</p>
                    )}
                    {c.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => void handleEnroll(c.id)}
                    disabled={enrolling === c.id}
                    className="mt-auto flex items-center gap-1.5 text-sm text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors self-start disabled:opacity-50"
                  >
                    {enrolling === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Enroll
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}
