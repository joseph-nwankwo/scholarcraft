import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Target } from 'lucide-react'
import { assessmentApi, type LearningOutcome, type BloomLevel } from '../../../lib/api/assessment.api'
import { libraryApi } from '../../../lib/api/library.api'

const BLOOM_LEVELS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']
const BLOOM_COLORS: Record<BloomLevel, string> = {
  REMEMBER: 'bg-gray-100 text-gray-700', UNDERSTAND: 'bg-blue-100 text-blue-700',
  APPLY: 'bg-green-100 text-green-700', ANALYSE: 'bg-yellow-100 text-yellow-700',
  EVALUATE: 'bg-orange-100 text-orange-700', CREATE: 'bg-purple-100 text-purple-700',
}

function OutcomeForm({ initial, onSave, onClose }: {
  initial?: LearningOutcome; onSave: (data: Partial<LearningOutcome> & { description: string }) => void; onClose: () => void
}) {
  const [form, setForm] = useState({
    code: initial?.code ?? '',
    description: initial?.description ?? '',
    bloomLevel: initial?.bloomLevel ?? 'UNDERSTAND' as BloomLevel,
    category: initial?.category ?? '',
    courseId: initial?.courseId ?? '',
  })

  useQuery({
    queryKey: ['library-courses'],
    queryFn: () => libraryApi.list({ limit: 100 }),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="font-semibold text-lg mb-4">{initial ? 'Edit Outcome' : 'New Learning Outcome'}</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Code (optional)</label>
              <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. LO-1"
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bloom's Level</label>
              <select value={form.bloomLevel} onChange={(e) => setForm((f) => ({ ...f, bloomLevel: e.target.value as BloomLevel }))}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none">
                {BLOOM_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Students should be able to…"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Category</label>
              <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Knowledge, Skills"
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Bloom's badge</label>
              <span className={`inline-block text-xs px-2 py-1.5 rounded-full font-medium ${BLOOM_COLORS[form.bloomLevel]}`}>
                {form.bloomLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => { if (form.description.trim()) onSave(form) }}
            disabled={!form.description.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {initial ? 'Save Changes' : 'Create Outcome'}
          </button>
          <button onClick={onClose} className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function LearningOutcomesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<LearningOutcome | null>(null)
  const [bloomFilter, setBloomFilter] = useState<BloomLevel | ''>('')
  const [selectedCourse] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['outcomes', bloomFilter, selectedCourse],
    queryFn: () => assessmentApi.listOutcomes({
      bloomLevel: bloomFilter || undefined,
      courseId: selectedCourse || undefined,
      limit: 100,
    }),
  })
  const outcomes: LearningOutcome[] = (data as { data: LearningOutcome[] } | undefined)?.data ?? []

  const createMutation = useMutation({
    mutationFn: (dto: Parameters<typeof assessmentApi.createOutcome>[0]) => assessmentApi.createOutcome(dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['outcomes'] }); setShowForm(false) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof assessmentApi.updateOutcome>[1] }) =>
      assessmentApi.updateOutcome(id, dto),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['outcomes'] }); setEditing(null); setShowForm(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.deleteOutcome(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['outcomes'] }),
  })

  const handleSave = (formData: Partial<LearningOutcome> & { description: string }) => {
    if (editing) updateMutation.mutate({ id: editing.id, dto: formData })
    else createMutation.mutate(formData)
  }

  const byBloom = BLOOM_LEVELS.reduce<Record<BloomLevel, LearningOutcome[]>>((acc, l) => {
    acc[l] = outcomes.filter((o) => o.bloomLevel === l)
    return acc
  }, {} as Record<BloomLevel, LearningOutcome[]>)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Learning Outcomes</h1>
        <div className="flex gap-2">
          <select value={bloomFilter} onChange={(e) => setBloomFilter(e.target.value as BloomLevel | '')}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none">
            <option value="">All Bloom's Levels</option>
            {BLOOM_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90">
            + Add Outcome
          </button>
        </div>
      </div>

      {isLoading && <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>}

      {!isLoading && outcomes.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Target className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium">No learning outcomes defined</p>
          <p className="text-sm">Add outcomes to map to questions and assessments</p>
        </div>
      )}

      {bloomFilter ? (
        <div className="space-y-2">
          {outcomes.map((o) => (
            <OutcomeRow key={o.id} outcome={o}
              onEdit={(o) => { setEditing(o); setShowForm(true) }}
              onDelete={(id) => { if (confirm('Delete outcome?')) deleteMutation.mutate(id) }} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {BLOOM_LEVELS.filter((l) => byBloom[l].length > 0).map((level) => (
            <div key={level}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BLOOM_COLORS[level]}`}>{level}</span>
                <span className="text-xs text-muted-foreground">{byBloom[level].length} outcome{byBloom[level].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-1.5">
                {byBloom[level].map((o) => (
                  <OutcomeRow key={o.id} outcome={o}
                    onEdit={(o) => { setEditing(o); setShowForm(true) }}
                    onDelete={(id) => { if (confirm('Delete outcome?')) deleteMutation.mutate(id) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OutcomeForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function OutcomeRow({ outcome, onEdit, onDelete }: {
  outcome: LearningOutcome
  onEdit: (o: LearningOutcome) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card hover:shadow-sm">
      {outcome.code && (
        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{outcome.code}</span>
      )}
      <p className="flex-1 text-sm text-foreground">{outcome.description}</p>
      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
        <span>{outcome._count?.questionMaps ?? 0} questions</span>
        <span>{outcome._count?.assessmentMaps ?? 0} assessments</span>
        <button onClick={() => onEdit(outcome)} className="text-primary hover:underline">Edit</button>
        <button onClick={() => onDelete(outcome.id)} className="text-red-600 hover:underline">Delete</button>
      </div>
    </div>
  )
}
