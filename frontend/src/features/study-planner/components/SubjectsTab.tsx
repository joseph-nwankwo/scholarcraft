import { useState } from 'react'
import { Plus, BookOpen } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { useSubjects } from '../hooks/useSubjects'
import type { useTasks } from '../hooks/useTasks'
import type { StudySubject } from '@/lib/api/studyPlanner.api'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#64748b', '#292524',
]

const emptyForm = { name: '', color: '#6366f1', description: '' }

interface Props {
  subjectsState: ReturnType<typeof useSubjects>
  tasksState:    ReturnType<typeof useTasks>
}

export function SubjectsTab({ subjectsState, tasksState }: Props) {
  const { subjects, loading, error, create, update, remove } = subjectsState
  const { tasks } = tasksState

  const [form, setForm]           = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { name: form.name.trim(), color: form.color, description: form.description.trim() }
      if (editingId) {
        await update(editingId, payload)
        setEditingId(null)
      } else {
        await create(payload)
      }
      setForm(emptyForm)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(subject: StudySubject) {
    setForm({ name: subject.name, color: subject.color, description: subject.description ?? '' })
    setEditingId(subject.id)
    setShowForm(true)
  }

  function cancelForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="warning" description={error} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Subjects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Organise your study topics and track progress per subject.</p>
        </div>
        {!showForm && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}>
            New Subject
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="font-semibold text-foreground mb-4">{editingId ? 'Edit Subject' : 'New Subject'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TextField
              label="Subject name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Biology"
              required
              autoFocus
            />
            <ColorPicker value={form.color} onChange={(color) => setForm((p) => ({ ...p, color }))} />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Optional description"
            />
            <div className="flex gap-3 pt-1">
              <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Add Subject'}</Button>
              <Button type="button" variant="secondary" onClick={cancelForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden animate-pulse">
              <div className="h-1.5 bg-muted" />
              <div className="p-5 space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-7 w-7" />}
          title="No subjects yet"
          description="Create your first subject to start organising tasks by topic."
          action={{ label: 'New Subject', onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const taskCount = tasks.filter((t) => t.subjectId === subject.id).length
            return (
              <SubjectCard
                key={subject.id}
                subject={subject}
                taskCount={taskCount}
                isEditing={editingId === subject.id}
                onEdit={() => startEdit(subject)}
                onDeleteRequest={() => setDeletingId(subject.id)}
              />
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this subject?"
        description="This cannot be undone. Tasks using this subject won't be deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await remove(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}

function SubjectCard({ subject, taskCount, isEditing, onEdit, onDeleteRequest }: {
  subject: StudySubject
  taskCount: number
  isEditing: boolean
  onEdit: () => void
  onDeleteRequest: () => void
}) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden shadow-card transition-all', isEditing && 'ring-2 ring-primary/30 border-primary/40')}>
      <div className="h-1.5" style={{ backgroundColor: subject.color }} />
      <div className="p-5">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ backgroundColor: subject.color }} />
          <h3 className="font-semibold text-foreground leading-snug break-words">{subject.name}</h3>
        </div>
        {subject.description && (
          <p className="text-xs text-muted-foreground mt-1 mb-0 line-clamp-2 pl-5">{subject.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 pl-5">
          {taskCount} task{taskCount !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2 mt-4">
          <button
            onClick={onEdit}
            className="flex-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDeleteRequest}
            className="flex-1 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:bg-error-muted hover:text-error transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const isCustom = !PRESET_COLORS.includes(value)

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">Color</label>
      <div className="flex flex-wrap items-center gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            className={cn(
              'w-7 h-7 rounded-full transition-all focus:outline-none',
              value === c ? 'ring-2 ring-offset-2 ring-foreground/60 scale-110' : 'hover:scale-110'
            )}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="relative w-7 h-7" title="Custom color">
          <div
            className={cn(
              'w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center',
              isCustom ? 'border-foreground/60 ring-2 ring-offset-2 ring-foreground/60 scale-110' : 'border-border'
            )}
            style={isCustom ? { backgroundColor: value } : {}}
          >
            {!isCustom && <Plus className="h-3 w-3 text-muted-foreground" />}
          </div>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full rounded-full"
            aria-label="Custom color"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: value }} />
        <span className="text-xs text-muted-foreground font-mono">{value}</span>
      </div>
    </div>
  )
}
