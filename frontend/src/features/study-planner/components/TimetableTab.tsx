import { useState } from 'react'
import { Plus, CalendarClock } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { SkeletonCard } from '@/components/design-system/feedback/Skeleton'
import { useTimetable } from '../hooks/useTimetable'
import type { useSubjects } from '../hooks/useSubjects'
import type { TimetableEntry } from '@/lib/api/studyPlanner.api'

const DAYS = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

const emptyForm = { title: '', subjectId: '', dayOfWeek: 0, startTime: '09:00', endTime: '10:00' }

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

interface Props {
  subjectsState: ReturnType<typeof useSubjects>
}

export function TimetableTab({ subjectsState }: Props) {
  const { entries, loading, error, create, update, remove } = useTimetable()
  const { subjects } = subjectsState

  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || form.startTime >= form.endTime) return
    setSaving(true)
    try {
      const payload = {
        title:     form.title.trim(),
        subjectId: form.subjectId || null,
        dayOfWeek: form.dayOfWeek,
        startTime: form.startTime,
        endTime:   form.endTime,
      }
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

  function startEdit(entry: TimetableEntry) {
    setForm({
      title: entry.title,
      subjectId: entry.subjectId ?? '',
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })
    setEditingId(entry.id)
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
          <h2 className="text-lg font-semibold text-foreground">Study Timetable</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Plan your recurring weekly study blocks.</p>
        </div>
        {!showForm && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true) }}>
            Add Study Block
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? 'Edit Study Block' : 'New Study Block'}</h3>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Biology Revision"
            required
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <SelectField
              label="Day"
              value={String(form.dayOfWeek)}
              onValueChange={(v) => setForm((p) => ({ ...p, dayOfWeek: Number(v) }))}
              options={DAYS.map((d) => ({ value: String(d.value), label: d.label }))}
            />
            <SelectField
              label="Subject"
              value={form.subjectId}
              onValueChange={(v) => setForm((p) => ({ ...p, subjectId: v }))}
              placeholder="None"
              options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            />
            <TextField
              label="Start time"
              type="time"
              value={form.startTime}
              onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
              required
            />
            <TextField
              label="End time"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
              required
              error={form.startTime >= form.endTime ? 'Must be after start time' : undefined}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>{editingId ? 'Save Changes' : 'Add Block'}</Button>
            <Button type="button" variant="secondary" onClick={cancelForm}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : entries.length === 0 && !showForm ? (
        <EmptyState
          icon={<CalendarClock className="h-7 w-7" />}
          title="No study blocks yet"
          description="Add recurring weekly blocks to build your study timetable."
          action={{ label: 'Add Study Block', onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {DAYS.map((day) => {
            const dayEntries = entries
              .filter((e) => e.dayOfWeek === day.value)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
            return (
              <div key={day.value} className="rounded-xl border bg-card shadow-card overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/30">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{day.label}</h3>
                </div>
                <div className="p-2 space-y-2 min-h-16">
                  {dayEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 text-center py-3">—</p>
                  ) : (
                    dayEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => startEdit(entry)}
                        className="w-full text-left rounded-lg p-2 border transition-colors hover:shadow-sm group relative"
                        style={{
                          backgroundColor: entry.subject ? `${entry.subject.color}14` : 'var(--muted)',
                          borderColor: entry.subject ? `${entry.subject.color}40` : 'var(--border)',
                        }}
                      >
                        <p className="text-xs font-semibold text-foreground leading-snug truncate pr-4">{entry.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </p>
                        {entry.subject && (
                          <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: entry.subject.color }}>
                            {entry.subject.name}
                          </span>
                        )}
                        <span
                          onClick={(e) => { e.stopPropagation(); setDeletingId(entry.id) }}
                          className="absolute top-1 right-1 text-muted-foreground hover:text-error opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1"
                        >
                          ✕
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this study block?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await remove(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}
