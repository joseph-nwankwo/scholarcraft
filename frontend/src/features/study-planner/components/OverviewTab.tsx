import { useMemo, useState } from 'react'
import { BookOpen, ClipboardList, CheckCircle2, Clock, BarChart3 } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { StatCard } from '@/components/design-system/cards/StatCard'
import { ProgressBar } from '@/components/design-system/feedback/ProgressBar'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { SkeletonStatCard, SkeletonListItem } from '@/components/design-system/feedback/Skeleton'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import type { useSubjects } from '../hooks/useSubjects'
import type { useTasks } from '../hooks/useTasks'
import type { useStudySessions } from '../hooks/useStudySessions'

const PRIORITY_VARIANT = { HIGH: 'error', MEDIUM: 'warning', LOW: 'success' } as const

interface Props {
  subjectsState: ReturnType<typeof useSubjects>
  tasksState:    ReturnType<typeof useTasks>
  sessionsState: ReturnType<typeof useStudySessions>
  onViewAllTasks?: () => void
}

export function OverviewTab({ subjectsState, tasksState, sessionsState, onViewAllTasks }: Props) {
  const { user } = useAuth()
  const { subjects, loading: subjectsLoading, error: subjectsError } = subjectsState
  const { tasks, loading: tasksLoading, error: tasksError, toggle } = tasksState
  const { sessions, loading: sessionsLoading, error: sessionsError, log } = sessionsState

  const isLoading = subjectsLoading || tasksLoading || sessionsLoading
  const anyError  = subjectsError || tasksError || sessionsError
  const displayName = user?.firstName || user?.name || 'there'

  const weekAgo = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime() - 6 * 24 * 60 * 60 * 1000
  }, [])

  const stats = useMemo(() => {
    const total     = tasks.length
    const completed = tasks.filter((t) => t.completed).length
    const weeklyMins = sessions
      .filter((s) => s.durationMinutes != null && new Date(s.startTime).getTime() >= weekAgo)
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)

    return {
      subjects: subjects.length,
      total,
      completed,
      pending: total - completed,
      weeklyHours: (weeklyMins / 60).toFixed(1),
    }
  }, [tasks, subjects, sessions, weekAgo])

  const progressPct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0

  const subjectProgress = useMemo(() => subjects.map((subject) => {
    const subjectTasks = tasks.filter((t) => t.subjectId === subject.id)
    const completed = subjectTasks.filter((t) => t.completed).length
    const minutes = sessions
      .filter((s) => s.subjectId === subject.id)
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)
    return { subject, total: subjectTasks.length, completed, minutes }
  }), [subjects, tasks, sessions])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{getGreeting(displayName)}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s your study overview for today.</p>
      </div>

      {anyError && <Alert variant="warning" title="Couldn't load some data" description={anyError} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Subjects"     value={stats.subjects} icon={<BookOpen className="h-5 w-5" />} />
            <StatCard label="Total Tasks"  value={stats.total} icon={<ClipboardList className="h-5 w-5" />} color="primary" />
            <StatCard label="Completed"    value={stats.completed} icon={<CheckCircle2 className="h-5 w-5" />} color="success" />
            <StatCard label="Pending"      value={stats.pending} icon={<Clock className="h-5 w-5" />} color="warning" />
            <StatCard label="Weekly Hours" value={`${stats.weeklyHours}h`} icon={<BarChart3 className="h-5 w-5" />} />
          </>
        )}
      </div>

      {!isLoading && stats.total > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <ProgressBar
            label="Task progress"
            value={stats.completed}
            max={stats.total}
            showValue
            variant="success"
          />
          <p className="text-xs text-muted-foreground mt-2">{progressPct}% complete</p>
        </div>
      )}

      {!isLoading && subjectProgress.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-semibold text-foreground mb-4">Progress by Subject</h2>
          <div className="space-y-4">
            {subjectProgress.map(({ subject, total, completed, minutes }) => (
              <div key={subject.id}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5 min-w-0 truncate">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                    {subject.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {total > 0 ? `${completed}/${total} tasks` : 'No tasks'} · {(minutes / 60).toFixed(1)}h
                  </span>
                </div>
                <ProgressBar value={completed} max={Math.max(total, 1)} size="sm" variant="primary" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentTasks tasks={tasks.slice(0, 6)} loading={tasksLoading} toggle={toggle} onViewAll={onViewAllTasks} />
        </div>
        <div className="space-y-4">
          <QuickLogSession subjects={subjects} onLog={log} />
          <RecentSessions sessions={sessions.slice(0, 4)} loading={sessionsLoading} />
        </div>
      </div>
    </div>
  )
}

// ── Recent tasks ────────────────────────────────────────────────────────────────

function RecentTasks({ tasks, loading, toggle, onViewAll }: {
  tasks: ReturnType<typeof useTasks>['tasks']
  loading: boolean
  toggle: ReturnType<typeof useTasks>['toggle']
  onViewAll?: () => void
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Recent Tasks</h2>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs font-medium text-primary hover:underline">
            View all →
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonListItem key={i} />)}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          size="sm"
          icon={<ClipboardList className="h-6 w-6" />}
          title="No tasks yet"
          description="Add a task from the Tasks tab to see it here."
        />
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 py-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggle(task)}
                className="h-4 w-4 accent-primary cursor-pointer shrink-0"
              />
              <span className={`flex-1 text-sm min-w-0 truncate ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">{task.priority.toLowerCase()}</Badge>
                {task.subject && <Badge variant="default" size="sm">{task.subject.name}</Badge>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Recent sessions ─────────────────────────────────────────────────────────────

function RecentSessions({ sessions, loading }: {
  sessions: ReturnType<typeof useStudySessions>['sessions']
  loading: boolean
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="font-semibold text-foreground mb-3">Recent Sessions</h2>
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No sessions logged yet.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm">
                📖
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{s.subject?.name || 'General Study'}</p>
                <p className="text-xs text-muted-foreground">
                  {s.durationMinutes != null ? `${s.durationMinutes} min` : 'In progress'}
                  {s.startTime ? ` · ${new Date(s.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Quick log session ───────────────────────────────────────────────────────────

function QuickLogSession({ subjects, onLog }: {
  subjects: ReturnType<typeof useSubjects>['subjects']
  onLog: ReturnType<typeof useStudySessions>['log']
}) {
  const [subjectId, setSubjectId] = useState<string>('')
  const [duration, setDuration]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const mins = parseInt(duration, 10)
    if (!mins || mins <= 0) return
    setSaving(true)
    try {
      await onLog({ subjectId: subjectId || null, durationMinutes: mins })
      setSubjectId('')
      setDuration('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-card">
      <h2 className="font-semibold text-foreground mb-3">Log Study Session</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <SelectField
          label="Subject"
          value={subjectId}
          onValueChange={setSubjectId}
          placeholder="General Study"
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
        />
        <TextField
          label="Duration (minutes)"
          type="number"
          min={1}
          max={480}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g. 45"
          required
        />
        <Button type="submit" fullWidth loading={saving} variant={success ? 'success' : 'primary'}>
          {success ? '✓ Logged!' : 'Log Session'}
        </Button>
      </form>
    </div>
  )
}

// ── Utilities ────────────────────────────────────────────────────────────────

function getGreeting(name: string) {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}!`
  if (h < 17) return `Good afternoon, ${name}!`
  return `Good evening, ${name}!`
}
