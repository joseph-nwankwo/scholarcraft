import { useState, useMemo, createContext, useContext } from 'react'
import { DayPicker, type DayButtonProps } from 'react-day-picker'
import 'react-day-picker/style.css'
import { Badge } from '@/components/design-system/display/Badge'
import { SkeletonListItem } from '@/components/design-system/feedback/Skeleton'
import { cn } from '@/lib/utils'
import type { useTasks } from '../hooks/useTasks'
import type { StudyTask } from '@/lib/api/studyPlanner.api'

const PRIORITY_VARIANT = { HIGH: 'error', MEDIUM: 'warning', LOW: 'success' } as const

function toDateStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function strToLocalDate(str: string) {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toDateStr(new Date(y, m - 1, d + n))
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const CalendarCtx = createContext<{ tasksByDate: Record<string, StudyTask[]>; todayStr: string }>({ tasksByDate: {}, todayStr: '' })

function DayBtn({ day, modifiers, ...buttonProps }: DayButtonProps) {
  const { tasksByDate, todayStr } = useContext(CalendarCtx)
  const dateStr  = toDateStr(day.date)
  const dayTasks = tasksByDate[dateStr] ?? []
  const pending  = dayTasks.filter((t) => !t.completed).length
  const done     = dayTasks.filter((t) => t.completed).length
  const overdue  = dateStr < todayStr && pending > 0

  return (
    <button
      {...buttonProps}
      className={cn(
        'relative flex flex-col items-center justify-center h-10 w-full rounded-lg text-sm transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 select-none cursor-pointer',
        modifiers.selected ? 'bg-primary text-primary-foreground hover:bg-primary/90'
        : modifiers.today ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15'
        : modifiers.outside ? 'text-muted-foreground/50 hover:bg-muted'
        : modifiers.disabled ? 'text-muted-foreground/50 cursor-not-allowed'
        : overdue ? 'text-error hover:bg-error-muted'
        : 'text-foreground hover:bg-muted'
      )}
    >
      <span>{day.date.getDate()}</span>
      {(pending > 0 || done > 0) && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {pending > 0 && (
            <span className={cn('w-1 h-1 rounded-full', overdue ? 'bg-error' : modifiers.selected ? 'bg-primary-foreground' : 'bg-primary')} />
          )}
          {done > 0 && (
            <span className={cn('w-1 h-1 rounded-full', modifiers.selected ? 'bg-success/70' : 'bg-success')} />
          )}
        </span>
      )}
    </button>
  )
}

const CAL_CLASSES = {
  root: 'w-full',
  months: 'w-full relative',
  month: 'w-full',
  month_caption: 'flex items-center justify-center h-10 mb-2',
  caption_label: 'text-base font-semibold text-foreground',
  nav: 'absolute inset-x-0 top-0 h-10 px-1 flex items-center justify-between pointer-events-none',
  button_previous: 'pointer-events-auto p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-flex items-center justify-center',
  button_next: 'pointer-events-auto p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-flex items-center justify-center',
  month_grid: 'w-full table-fixed border-collapse',
  weekday: 'pb-2 text-center text-xs font-medium text-muted-foreground',
  day: 'p-0.5 align-middle',
  day_button: '',
  hidden: 'invisible',
  chevron: 'fill-muted-foreground w-4 h-4',
}

interface Props {
  tasksState: ReturnType<typeof useTasks>
}

export function ScheduleTab({ tasksState }: Props) {
  const { tasks, loading, toggle } = tasksState

  const [selected, setSelected] = useState(new Date())

  const todayStr = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return toDateStr(d)
  }, [])

  const tasksByDate = useMemo(() => {
    const map: Record<string, StudyTask[]> = {}
    tasks.forEach((t) => {
      if (t.dueDate) {
        const key = t.dueDate.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    })
    return map
  }, [tasks])

  const { taskDates, overdueDates } = useMemo(() => {
    const taskDates: Date[] = []
    const overdueDates: Date[] = []
    Object.entries(tasksByDate).forEach(([d, ts]) => {
      taskDates.push(strToLocalDate(d))
      if (d < todayStr && ts.some((t) => !t.completed)) overdueDates.push(strToLocalDate(d))
    })
    return { taskDates, overdueDates }
  }, [tasksByDate, todayStr])

  const selectedStr   = toDateStr(selected)
  const selectedTasks = tasksByDate[selectedStr] ?? []

  const upcomingTasks = useMemo(() =>
    tasks
      .filter((t) => t.dueDate && !t.completed && t.dueDate.slice(0, 10) >= todayStr)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 10),
    [tasks, todayStr]
  )

  const ctxValue = useMemo(() => ({ tasksByDate, todayStr }), [tasksByDate, todayStr])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <CalendarCtx.Provider value={ctxValue}>
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={(day) => day && setSelected(day)}
              showOutsideDays
              classNames={CAL_CLASSES}
              components={{ DayButton: DayBtn }}
              modifiers={{ overdue: overdueDates, hasTask: taskDates }}
            />
          </CalendarCtx.Provider>
          <div className="mt-4 pt-3 border-t flex flex-wrap gap-5">
            <LegendDot className="bg-primary" label="Pending" />
            <LegendDot className="bg-success" label="Completed" />
            <LegendDot className="bg-error" label="Overdue" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{formatDisplayDate(selected)}</h3>
            <span className="text-sm text-muted-foreground">{selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonListItem key={i} />)}</div>
          ) : selectedTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No tasks scheduled for this day.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Set a due date on a task to have it appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {selectedTasks.map((task) => (
                <li key={task.id} className="flex items-start gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggle(task)}
                    className="mt-0.5 h-4 w-4 accent-primary cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', task.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                      {task.title}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">{task.priority.toLowerCase()}</Badge>
                      {task.subject && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: task.subject.color }}>
                          {task.subject.name}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold text-foreground mb-4">Upcoming Tasks</h3>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}</div>
          ) : upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming tasks with due dates.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingTasks.map((task) => {
                const dueStr     = task.dueDate!.slice(0, 10)
                const isToday    = dueStr === todayStr
                const isTomorrow = dueStr === addDays(todayStr, 1)
                const isThisWeek = dueStr <= addDays(todayStr, 7)
                const label      = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dueStr

                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => setSelected(strToLocalDate(dueStr))}
                  >
                    <span
                      className={cn(
                        'shrink-0 px-2 py-1 rounded text-xs font-semibold leading-none whitespace-nowrap',
                        isToday ? 'bg-primary/10 text-primary' : isThisWeek ? 'bg-warning-muted text-warning' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">{task.title}</p>
                      {task.subject && <p className="text-xs mt-0.5 font-medium" style={{ color: task.subject.color }}>{task.subject.name}</p>}
                    </div>
                    <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">{task.priority[0]}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn('w-1.5 h-1.5 rounded-full', className)} />
      {label}
    </span>
  )
}
