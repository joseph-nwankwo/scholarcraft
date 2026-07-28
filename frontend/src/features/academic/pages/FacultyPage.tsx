import { useState, useCallback } from 'react'
import { Building2, Plus, Pencil, Trash2, Users, BookOpen, GraduationCap } from 'lucide-react'
import { facultyApi, type Faculty } from '@/lib/api/academic.api'
import { useAsync, useErrorMsg } from '../hooks/useAcademic'
import { AcademicDialog } from '../components/AcademicDialog'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

interface FormState { name: string; code: string; abbreviation: string; description: string }
const EMPTY_FORM: FormState = { name: '', code: '', abbreviation: '', description: '' }

function FacultyCard({ faculty, onEdit, onDelete }: { faculty: Faculty; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-foreground">{faculty.name}</h3>
            <p className="text-xs text-muted-foreground font-mono">{faculty.code}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit} aria-label="Edit" />
          <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={onDelete} className="text-destructive hover:text-destructive" aria-label="Delete" />
        </div>
      </div>

      {faculty.abbreviation && <Badge variant="default" size="sm" className="mt-3">{faculty.abbreviation}</Badge>}
      {faculty.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{faculty.description}</p>}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" />
          {faculty._count?.departments ?? 0} departments
        </span>
        {faculty.dean && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            Dean: {faculty.dean.name}
          </span>
        )}
      </div>
    </div>
  )
}

export default function FacultyPage() {
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; faculty?: Faculty } | null>(null)
  const [form, setForm]   = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => facultyApi.list({ search: search || undefined, limit: 100 }),
    [search]
  )

  const openCreate = useCallback(() => { setForm(EMPTY_FORM); setFormErr(''); setDialog({ mode: 'create' }) }, [])
  const openEdit = useCallback((f: Faculty) => {
    setForm({ name: f.name, code: f.code, abbreviation: f.abbreviation ?? '', description: f.description ?? '' })
    setFormErr('')
    setDialog({ mode: 'edit', faculty: f })
  }, [])

  function upd(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) { setFormErr('Name and code are required'); return }
    setSaving(true); setFormErr('')
    try {
      if (dialog?.mode === 'create') await facultyApi.create({ ...form, code: form.code.toUpperCase() })
      else await facultyApi.update(dialog!.faculty!.id, { ...form, code: form.code.toUpperCase() })
      setDialog(null)
      reload()
    } catch (err) { setFormErr(useErrorMsg(err)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try { await facultyApi.delete(deleteTarget.id); setDeleteTarget(null); reload() }
    catch { /* toast handled globally */ }
  }

  const faculties = data?.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Faculties
          </h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} faculties in your institution</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Faculty</Button>
      </div>

      {/* Search */}
      <TextField
        placeholder="Search faculties…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {error && <Alert variant="error" description={error} />}

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : faculties.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="h-6 w-6" />}
          title="No faculties yet"
          description="Create your first faculty to start building your academic structure."
          action={{ label: 'Add Faculty', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {faculties.map((f) => (
            <FacultyCard key={f.id} faculty={f} onEdit={() => openEdit(f)} onDelete={() => setDeleteTarget(f)} />
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AcademicDialog
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.mode === 'create' ? 'Add Faculty' : 'Edit Faculty'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErr && <Alert variant="error" description={formErr} />}
          <TextField label="Faculty name" value={form.name} onChange={upd('name')} placeholder="e.g. Faculty of Engineering" required disabled={saving} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Code" value={form.code} onChange={upd('code')} placeholder="ENG" required disabled={saving} hint="Unique identifier" />
            <TextField label="Abbreviation" value={form.abbreviation} onChange={upd('abbreviation')} placeholder="FOE" disabled={saving} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea rows={3} value={form.description} onChange={upd('description')} disabled={saving}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
              placeholder="Brief description of the faculty…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
              {dialog?.mode === 'create' ? 'Create faculty' : 'Save changes'}
            </Button>
          </div>
        </form>
      </AcademicDialog>

      {/* Delete Confirm */}
      <AcademicDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete faculty?"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-5">
          This will soft-delete <strong>{deleteTarget?.name}</strong> and all its departments.
          Existing courses will not be removed.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete faculty</Button>
        </div>
      </AcademicDialog>
    </div>
  )
}
