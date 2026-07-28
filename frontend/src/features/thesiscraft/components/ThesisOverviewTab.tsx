import { useState } from 'react'
import { AlignLeft, BookMarked, GraduationCap, FileSearch } from 'lucide-react'
import { StatCard } from '@/components/design-system/cards/StatCard'
import { ProgressBar } from '@/components/design-system/feedback/ProgressBar'
import { TextField } from '@/components/design-system/inputs/TextField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { Button } from '@/components/design-system/buttons/Button'
import type { useThesis } from '../hooks/useThesis'
import type { ThesisStatus } from '@/lib/api/thesiscraft.api'

const STATUS_OPTIONS: { value: ThesisStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
]

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function ThesisOverviewTab({ thesisState }: Props) {
  const { thesis, updateMeta } = thesisState
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    title: thesis?.title ?? '',
    field: thesis?.field ?? '',
    degreeType: thesis?.degreeType ?? '',
    supervisorName: thesis?.supervisorName ?? '',
  })

  if (!thesis) return null

  const chaptersComplete = thesis.chapters.filter((c) => c.status === 'COMPLETE').length
  const proposalSectionsCount = Object.values(thesis.proposalSections).filter((v) => v?.trim()).length
  const totalWords = thesis.chapters.reduce((sum, c) => sum + (c.content?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0)

  function startEdit() {
    setForm({
      title: thesis!.title,
      field: thesis!.field ?? '',
      degreeType: thesis!.degreeType ?? '',
      supervisorName: thesis!.supervisorName ?? '',
    })
    setEditing(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await updateMeta({
      title: form.title.trim(),
      field: form.field.trim() || undefined,
      degreeType: form.degreeType.trim() || undefined,
      supervisorName: form.supervisorName.trim() || undefined,
    })
    setEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-card">
        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <TextField label="Thesis title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required autoFocus />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <TextField label="Field of study" value={form.field} onChange={(e) => setForm((p) => ({ ...p, field: e.target.value }))} placeholder="e.g. Computer Science" />
              <TextField label="Degree" value={form.degreeType} onChange={(e) => setForm((p) => ({ ...p, degreeType: e.target.value }))} placeholder="e.g. MSc, PhD" />
              <TextField label="Supervisor" value={form.supervisorName} onChange={(e) => setForm((p) => ({ ...p, supervisorName: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex gap-3">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{thesis.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {[thesis.degreeType, thesis.field].filter(Boolean).join(' · ') || 'No field/degree set'}
                {thesis.supervisorName && ` · Supervisor: ${thesis.supervisorName}`}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <SelectField
                value={thesis.status}
                onValueChange={(v) => updateMeta({ status: v as ThesisStatus })}
                options={STATUS_OPTIONS}
                fieldClassName="w-40"
              />
              <Button variant="outline" size="sm" onClick={startEdit}>Edit</Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Chapters" value={`${chaptersComplete}/${thesis.chapters.length}`} icon={<AlignLeft className="h-5 w-5" />} color="primary" />
        <StatCard label="Proposal Sections" value={`${proposalSectionsCount}/6`} icon={<FileSearch className="h-5 w-5" />} />
        <StatCard label="Citations" value={thesis.citations.length} icon={<BookMarked className="h-5 w-5" />} />
        <StatCard label="Total Words" value={totalWords.toLocaleString()} icon={<GraduationCap className="h-5 w-5" />} />
      </div>

      {thesis.chapters.length > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <ProgressBar
            label="Chapter progress"
            value={chaptersComplete}
            max={thesis.chapters.length}
            showValue
            variant="success"
          />
        </div>
      )}
    </div>
  )
}
