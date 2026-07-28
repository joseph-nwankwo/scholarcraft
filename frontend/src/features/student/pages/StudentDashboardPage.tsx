import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, ClipboardList, CheckCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { studentApi, type DashboardData } from '@/lib/api/student.api'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

function fmtDate(d: string | null) {
  if (!d) return 'No due date'
  const dt = new Date(d)
  const now = new Date()
  const diff = dt.getTime() - now.getTime()
  const days = Math.ceil(diff / 86400000)
  if (days < 0)  return `Overdue by ${Math.abs(days)}d`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

function statusColor(status: string) {
  switch (status) {
    case 'GRADED':    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'SUBMITTED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'LATE':      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'RETURNED':  return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    default:          return 'bg-muted text-muted-foreground'
  }
}

export default function StudentDashboardPage() {
  const { user }                    = useAuth()
  const [data, setData]             = useState<DashboardData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    studentApi.getDashboard()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  )

  if (error) return (
    <div className="px-6 py-10 text-center text-muted-foreground">
      <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
      {error}
    </div>
  )

  const stats = data?.stats

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName ?? user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your studies.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Enrolled Courses', value: data?.enrolledCourses ?? 0, icon: BookOpen, color: 'text-blue-600' },
          { label: 'Pending Assignments', value: data?.pendingAssignments.length ?? 0, icon: ClipboardList, color: 'text-orange-500' },
          { label: 'Total Submissions', value: stats?.totalSubmissions ?? 0, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Avg Grade', value: stats?.avgGrade != null ? `${stats.avgGrade.toFixed(1)}%` : '—', icon: TrendingUp, color: 'text-purple-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('h-4 w-4', color)} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending assignments */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Pending Assignments</h2>
            <Link to={ROUTES.STUDENT_COURSES} className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {(data?.pendingAssignments.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">All caught up! No pending assignments.</p>
          ) : (
            <ul className="space-y-3">
              {data!.pendingAssignments.slice(0, 6).map((a) => {
                const due = a.dueDate ? new Date(a.dueDate) : null
                const overdue = due && due < new Date()
                return (
                  <li key={a.id}>
                    <Link
                      to={ROUTES.STUDENT_ASSIGNMENT.replace(':assessmentId', a.id)}
                      className="flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {a.title}
                        </p>
                        {a.course && (
                          <p className="text-xs text-muted-foreground">{a.course.code} · {a.course.title}</p>
                        )}
                      </div>
                      <span className={cn(
                        'text-xs whitespace-nowrap shrink-0 flex items-center gap-1',
                        overdue ? 'text-red-600' : 'text-muted-foreground',
                      )}>
                        <Clock className="h-3 w-3" />
                        {fmtDate(a.dueDate)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Recent submissions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Recent Submissions</h2>
            <Link to={ROUTES.STUDENT_SUBMISSIONS} className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {(data?.recentSubmissions.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No submissions yet.</p>
          ) : (
            <ul className="space-y-3">
              {data!.recentSubmissions.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.assessment?.title}</p>
                    {s.assessment?.course && (
                      <p className="text-xs text-muted-foreground">{s.assessment.course.code}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', statusColor(s.status))}>
                      {s.status}
                    </span>
                    {s.grade != null && (
                      <span className="text-xs font-semibold text-foreground">
                        {s.grade}/{s.assessment?.totalMarks}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
