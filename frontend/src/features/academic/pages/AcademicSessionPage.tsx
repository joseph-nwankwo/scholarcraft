import { useState, useCallback } from 'react'
import { CalendarDays, Plus, Pencil, Trash2, Star } from 'lucide-react'
import { sessionApi, type AcademicSession } from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { cn } from '@/lib/utils'

interface FormState { name: string; startDate: string; endDate: string; current: boolean }
const EMPTY: FormState = { name: '', startDate: '', endDate: '', current: false }

function SessionCard({ session, onEdit, onDelete }: { session: AcademicSession; onEdit: () => void; onDelete: () => void }) {
  const start = new Date(session.startDate).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
  const end   = new Date(session.endDate).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
  const semCount = session.semesters?.length ?? 0

  return (
    <div className={cn('group relative rounded-xl border p-5 transition-shadow hover:shadow-md', session.current ? 'border-primary bg-primary/5' : 'border-border bg-card')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', session.current ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{session.name}</h3>
              {session.current && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground">{start} — {end}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit} />
          <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete} className="text-destructive hover:text-destructive" disabled={session.current} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {session.current && <Badge variant="success" size="sm">Current</Badge>}
        <Badge variant="default" size="sm">{semCount} semester{semCount !== 1 ? 's' : ''}</Badge>
      </div>
    </div>
  )
}

export default function AcademicSessionPage() {
  const [dialog, setDialog]       = useState<{ mode: 'create' | 'edit'; session?: AcademicSession } | null>(null)
  const [form, setForm]           = useState<FormState>(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [deleteTarget, setDelete] = useState<AcademicSession | null>(null)

  const { data: sessions, loading, error, reload } = useAsync(() => sessionApi.list(), [])

  const openCreate = useCallback(() => { setForm(EMPTY); setFormErr(''); setDialog({ mode: 'create' }) }, [])
  const openEdit = useCallback((s: AcademicSession) => {
    setForm({
      name: s.name,
      startDate: s.startDate.slice(0, 10),
      endDate: s.endDate.slice(0, 10),
      current: s.current,
    })
    setFormErr(''); setDialog({ mode: 'edit', session: s })
  }, [])

  function upd(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: field === 'current' ? (e.target as HTMLInputElement).checked : e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.startDate || !form.endDate) { setFormErr('All date fields are required'); return }
    setSaving(true); setFormErr('')
    try {
      if (dialog?.mode === 'create') await sessionApi.create(form)
      else await sessionApi.update(dialog!.session!.id, form)
      setDialog(null); reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await sessionApi.delete(deleteTarget.id); setDelete(null); reload() } catch { /**/ }
  }

  const list: AcademicSession[] = sessions?.data ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Academic Sessions
          </h1>
          <p className="text-sm text-muted-foreground">{list.length} sessions configured</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>New Session</Button>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-6 w-6" />} title="No academic sessions" description="Create your first academic session to get started." action={{ label: 'Create Session', onClick: openCreate }} />
      ) : (
        <div className="space-y-4">
          {list.map((s) => <SessionCard key={s.id} session={s} onEdit={() => openEdit(s)} onDelete={() => setDelete(s)} />)}
        </div>
      )}

      <AcademicDialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === 'create' ? 'New Academic Session' : 'Edit Session'} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}
          <TextField label="Session name" value={form.name} onChange={upd('name')} placeholder="e.g. 2024/2025" required disabled={saving} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Start date" type="date" value={form.startDate} onChange={upd('startDate')} required disabled={saving} />
            <TextField label="End date"   type="date" value={form.endDate}   onChange={upd('endDate')}   required disabled={saving} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.current} onChange={upd('current')} disabled={saving}
              className="h-4 w-4 rounded border border-input accent-primary" />
            <span className="text-sm font-medium">Mark as current session</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create session' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      <AcademicDialog open={!!deleteTarget} onClose={() => setDelete(null)} title="Delete session?" size="sm">
        <p className="text-sm text-muted-foreground mb-5">Delete <strong>{deleteTarget?.name}</strong>? All associated semesters will also be deleted.</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
