import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart2 } from 'lucide-react'
import { assessmentApi, type Rubric, type RubricLevel } from '../../../lib/api/assessment.api'

function RubricCard({ rubric, onEdit, onDelete }: {
  rubric: Rubric
  onEdit: (r: Rubric) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-start justify-between p-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">{rubric.title}</h3>
          {rubric.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{rubric.description}</p>}
          <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>{rubric.totalPoints} pts total</span>
            <span>·</span>
            <span>{rubric.criteria.length} criteria</span>
            <span>·</span>
            <span>{rubric._count?.assessments ?? 0} assessments</span>
          </div>
        </div>
        <div className="flex gap-2 ml-3 shrink-0">
          <button onClick={() => setExpanded((e) => !e)}
            className="text-xs border border-border px-2 py-1 rounded hover:bg-muted">
            {expanded ? 'Collapse' : 'Preview'}
          </button>
          <button onClick={() => onEdit(rubric)}
            className="text-xs border border-border px-2 py-1 rounded hover:bg-muted">Edit</button>
          <button onClick={() => onDelete(rubric.id)}
            className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50">Delete</button>
        </div>
      </div>
      {expanded && rubric.criteria.length > 0 && (
        <div className="border-t border-border overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Criterion</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Max Pts</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Levels</th>
              </tr>
            </thead>
            <tbody>
              {rubric.criteria.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{c.title}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{c.maxPoints}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 flex-wrap">
                      {(c.levels as RubricLevel[]).map((l, i) => (
                        <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-xs">{l.label}: {l.points}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface CriterionForm {
  title: string; description: string; maxPoints: string
  levels: Array<{ label: string; description: string; points: string }>
}

function defaultCriterion(): CriterionForm {
  return {
    title: '', description: '', maxPoints: '10',
    levels: [
      { label: 'Excellent', description: '', points: '10' },
      { label: 'Good', description: '', points: '7' },
      { label: 'Satisfactory', description: '', points: '5' },
      { label: 'Needs Improvement', description: '', points: '2' },
    ],
  }
}

function RubricFormModal({ initial, onSave, onClose }: {
  initial?: Rubric
  onSave: (data: { title: string; description?: string; totalPoints?: number; isPublic?: boolean; criteria: CriterionForm[] }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false)
  const [criteria, setCriteria] = useState<CriterionForm[]>(
    initial?.criteria.length
      ? initial.criteria.map((c) => ({
          title: c.title, description: c.description ?? '', maxPoints: String(c.maxPoints),
          levels: (c.levels as RubricLevel[]).map((l) => ({ label: l.label, description: l.description, points: String(l.points) })),
        }))
      : [defaultCriterion()]
  )

  const totalPoints = criteria.reduce((s, c) => s + (parseFloat(c.maxPoints) || 0), 0)

  const handleSave = () => {
    if (!title.trim()) return
    onSave({ title, description: description || undefined, totalPoints, isPublic, criteria })
  }

  const updateCriterion = (idx: number, field: string, val: string) =>
    setCriteria((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c))

  const updateLevel = (ci: number, li: number, field: string, val: string) =>
    setCriteria((prev) => prev.map((c, i) =>
      i === ci ? { ...c, levels: c.levels.map((l, j) => j === li ? { ...l, [field]: val } : l) } : c
    ))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          <h3 className="font-semibold flex-1">{initial ? 'Edit Rubric' : 'New Rubric'}</h3>
          <span className="text-sm text-muted-foreground">Total: {totalPoints} pts</span>
          <button onClick={onClose} className="text-xl text-muted-foreground hover:text-foreground leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> Share with institution
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-foreground">Criteria</h4>
              <button onClick={() => setCriteria((prev) => [...prev, defaultCriterion()])}
                className="text-xs text-primary hover:underline">+ Add criterion</button>
            </div>
            <div className="space-y-4">
              {criteria.map((c, ci) => (
                <div key={ci} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={c.title} onChange={(e) => updateCriterion(ci, 'title', e.target.value)}
                      placeholder="Criterion title"
                      className="flex-1 border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none" />
                    <input type="number" value={c.maxPoints} onChange={(e) => updateCriterion(ci, 'maxPoints', e.target.value)}
                      className="w-20 border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none" />
                    <button onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== ci))}
                      className="text-red-500 hover:text-red-600 text-lg leading-none px-1">×</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {c.levels.map((l, li) => (
                      <div key={li} className="space-y-1">
                        <input value={l.label} onChange={(e) => updateLevel(ci, li, 'label', e.target.value)}
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none font-medium" />
                        <input type="number" value={l.points} onChange={(e) => updateLevel(ci, li, 'points', e.target.value)}
                          className="w-full border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t border-border shrink-0">
          <button onClick={handleSave} disabled={!title.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {initial ? 'Save Changes' : 'Create Rubric'}
          </button>
          <button onClick={onClose} className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function RubricsPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Rubric | null>(null)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['rubrics', search],
    queryFn: () => assessmentApi.listRubrics({ search: search || undefined }),
  })
  const rubrics: Rubric[] = (data as { data: Rubric[] } | undefined)?.data ?? []

  const createMutation = useMutation({
    mutationFn: (dto: Parameters<typeof assessmentApi.createRubric>[0]) => assessmentApi.createRubric(dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rubrics'] }); setShowModal(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof assessmentApi.updateRubric>[1] }) =>
      assessmentApi.updateRubric(id, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['rubrics'] }); setEditing(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.deleteRubric(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['rubrics'] }),
  })

  const handleSave = (formData: { title: string; description?: string; totalPoints?: number; isPublic?: boolean; criteria: CriterionForm[] }) => {
    const dto = {
      ...formData,
      criteria: formData.criteria.map((c, i) => ({
        title: c.title, description: c.description || undefined,
        maxPoints: parseFloat(c.maxPoints) || 10, orderIndex: i,
        levels: c.levels.map((l) => ({ label: l.label, description: l.description, points: parseFloat(l.points) || 0 })),
      })),
    }
    if (editing) updateMutation.mutate({ id: editing.id, dto: dto as unknown as Parameters<typeof assessmentApi.updateRubric>[1] })
    else createMutation.mutate(dto as unknown as Parameters<typeof assessmentApi.createRubric>[0])
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Rubrics</h1>
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none" />
          <button onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90">
            + New Rubric
          </button>
        </div>
      </div>

      {isLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>}
      {!isLoading && rubrics.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium">No rubrics yet</p>
        </div>
      )}
      <div className="space-y-4">
        {rubrics.map((r) => (
          <RubricCard key={r.id} rubric={r}
            onEdit={(r) => { setEditing(r); setShowModal(true) }}
            onDelete={(id) => { if (confirm('Delete rubric?')) deleteMutation.mutate(id) }}
          />
        ))}
      </div>

      {showModal && (
        <RubricFormModal
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
