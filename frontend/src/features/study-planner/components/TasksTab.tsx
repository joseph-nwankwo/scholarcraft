import { useState, useMemo } from 'react'
import { Plus, ClipboardList, Bell } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { TextareaField } from '@/components/design-system/inputs/TextareaField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { SkeletonListItem } from '@/components/design-system/feedback/Skeleton'
import { cn } from '@/lib/utils'
import type { useTasks } from '../hooks/useTasks'
import type { useSubjects } from '../hooks/useSubjects'
import type { StudyTask, TaskPriority } from '@/lib/api/studyPlanner.api'

const PRIORITY_VARIANT = { HIGH: 'error', MEDIUM: 'warning', LOW: 'success' } as const
const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'completed', label: 'Completed' },
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]['key']

const emptyTask = { title: '', description: '', subjectId: '', priority: 'MEDIUM' as TaskPriority, dueDate: '', reminderMinutesBefore: '' }

const REMINDER_OPTIONS = [
  { value: '', label: 'No reminder' },
  { value: '0', label: 'At due time' },
  { value: '30', label: '30 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '180', label: '3 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '2880', label: '2 days before' },
]

function isOverdue(task: StudyTask) {
  if (!task.dueDate || task.completed) return false
  return task.dueDate.slice(0, 10) < new Date().toISOString().slice(0, 10)
}

interface Props {
  tasksState:    ReturnType<typeof useTasks>
  subjectsState: ReturnType<typeof useSubjects>
  onManageSubjects?: () => void
}

export function TasksTab({ tasksState, subjectsState, onManageSubjects }: Props) {
  const { tasks, loading, error, create, update, remove, toggle } = tasksState
  const { subjects } = subjectsState

  const [showForm, setShowForm]     = useState(false)
  const [taskForm, setTaskForm]     = useState(emptyTask)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>('all')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => tasks.filter((t) => {
    const matchesStatus =
      statusFilter === 'pending' ? !t.completed :
      statusFilter === 'completed' ? t.completed : true
    const matchesSubject = subjectFilter === '' || t.subjectId === subjectFilter
    return matchesStatus && matchesSubject
  }), [tasks, statusFilter, subjectFilter])

  const counts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  }), [tasks])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title:       taskForm.title.trim(),
        description: taskForm.description.trim() || undefined,
        subjectId:   taskForm.subjectId || null,
        priority:    taskForm.priority,
        dueDate:     taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : null,
        reminderMinutesBefore: taskForm.dueDate && taskForm.reminderMinutesBefore !== ''
          ? Number(taskForm.reminderMinutesBefore) : null,
      }
      if (editingId) {
        await update(editingId, payload)
        setEditingId(null)
      } else {
        await create(payload)
      }
      setTaskForm(emptyTask)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(task: StudyTask) {
    setTaskForm({
      title:       task.title,
      description: task.description ?? '',
      subjectId:   task.subjectId ?? '',
      priority:    task.priority,
      dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
      reminderMinutesBefore: task.reminderMinutesBefore != null ? String(task.reminderMinutesBefore) : '',
    })
    setEditingId(task.id)
    setShowForm(true)
  }

  function cancelForm() {
    setTaskForm(emptyTask)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="warning" description={error} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.pending} pending · {counts.completed} completed
          </p>
        </div>
        <Button
          leftIcon={!showForm || editingId ? <Plus className="h-4 w-4" /> : undefined}
          onClick={() => { if (showForm && !editingId) cancelForm(); else { setEditingId(null); setTaskForm(emptyTask); setShowForm(true) } }}
        >
          {showForm && !editingId ? 'Cancel' : 'New Task'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold text-foreground mb-4">{editingId ? 'Edit Task' : 'New Task'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Read Chapter 5"
              required
              autoFocus
            />
            <TextareaField
              label="Description"
              value={taskForm.description}
              onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional notes or description…"
              rows={3}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SelectField
                  label="Subject"
                  value={taskForm.subjectId}
                  onValueChange={(v) => setTaskForm((p) => ({ ...p, subjectId: v }))}
                  placeholder="None"
                  options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                />
                {onManageSubjects && (
                  <button
                    type="button"
                    onClick={onManageSubjects}
                    className="mt-1 text-xs text-primary hover:underline"
                  >
                    Manage subjects →
                  </button>
                )}
              </div>
              <SelectField
                label="Priority"
                value={taskForm.priority}
                onValueChange={(v) => setTaskForm((p) => ({ ...p, priority: v as TaskPriority }))}
                options={[
                  { value: 'HIGH', label: 'High' },
                  { value: 'MEDIUM', label: 'Medium' },
                  { value: 'LOW', label: 'Low' },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextField
                label="Due date"
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
              <SelectField
                label="Remind me"
                value={taskForm.reminderMinutesBefore}
                onValueChange={(v) => setTaskForm((p) => ({ ...p, reminderMinutesBefore: v }))}
                options={REMINDER_OPTIONS.filter((o) => o.value !== '').map((o) => ({ value: o.value, label: o.label }))}
                placeholder="No reminder"
                disabled={!taskForm.dueDate}
              />
            </div>
            {!taskForm.dueDate && (
              <p className="text-xs text-muted-foreground -mt-2">Set a due date to enable reminders.</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Add Task'}</Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex gap-2 flex-wrap items-center">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === key ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {label} <span className="ml-1 text-xs opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>

        {subjects.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Subject:</span>
            <button
              onClick={() => setSubjectFilter('')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                subjectFilter === '' ? 'bg-foreground text-background' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              )}
            >
              All
            </button>
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectFilter(subjectFilter === s.id ? '' : s.id)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  subjectFilter === s.id ? 'text-white' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
                )}
                style={subjectFilter === s.id ? { backgroundColor: s.color } : undefined}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonListItem key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<ClipboardList className="h-6 w-6" />}
            title={tasks.length === 0 ? 'No tasks yet' : 'No tasks match the current filters'}
            description={tasks.length === 0 ? 'Add your first task to get started.' : undefined}
            action={{ label: 'New Task', onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={() => toggle(task)}
                onEdit={() => startEdit(task)}
                onDeleteRequest={() => setDeletingId(task.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this task?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await remove(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}

function TaskRow({ task, onToggle, onEdit, onDeleteRequest }: {
  task: StudyTask
  onToggle: () => void
  onEdit: () => void
  onDeleteRequest: () => void
}) {
  const overdue = isOverdue(task)

  return (
    <li className="p-4 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={onToggle}
          className="mt-0.5 h-4 w-4 accent-primary cursor-pointer shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium leading-snug', task.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
            {task.title}
          </p>
          {task.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant={PRIORITY_VARIANT[task.priority]} size="sm">{task.priority.toLowerCase()}</Badge>
            {task.subject && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white"
                style={{ backgroundColor: task.subject.color }}
              >
                {task.subject.name}
              </span>
            )}
            {task.dueDate && (
              <Badge variant={overdue ? 'error' : 'outline'} size="sm">
                {overdue ? '⚠ Overdue · ' : 'Due '}{task.dueDate.slice(0, 10)}
              </Badge>
            )}
            {task.reminderMinutesBefore != null && !task.completed && (
              <Badge variant="default" size="sm">
                <Bell className="h-2.5 w-2.5 mr-1 inline" />
                {task.reminderMinutesBefore === 0 ? 'At due time'
                  : task.reminderMinutesBefore < 60 ? `${task.reminderMinutesBefore}m before`
                  : task.reminderMinutesBefore < 1440 ? `${task.reminderMinutesBefore / 60}h before`
                  : `${task.reminderMinutesBefore / 1440}d before`}
              </Badge>
            )}
            {task.completed && <Badge variant="success" size="sm">Done</Badge>}
          </div>
        </div>
        <div className="flex gap-3 shrink-0 ml-2">
          <button onClick={onEdit} className="text-xs text-primary hover:underline font-medium">Edit</button>
          <button onClick={onDeleteRequest} className="text-xs text-muted-foreground hover:text-error font-medium transition-colors">Delete</button>
        </div>
      </div>
    </li>
  )
}
