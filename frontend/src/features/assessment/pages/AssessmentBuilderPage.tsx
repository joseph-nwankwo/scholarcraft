import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { assessmentApi, type AssessmentDetail, type Question, type AssessmentType } from '../../../lib/api/assessment.api'
import { ROUTES } from '../../../constants/routes'

const ASSESSMENT_TYPES: AssessmentType[] = ['QUIZ', 'EXAM', 'ASSIGNMENT', 'PRACTICE', 'SURVEY']

function QuestionPicker({ assessmentId, onClose }: { assessmentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const { data } = useQuery({
    queryKey: ['questions-picker', search],
    queryFn: () => assessmentApi.listQuestions({ search: search || undefined, limit: 50 }),
  })
  const questions: Question[] = (data as { data: Question[] } | undefined)?.data ?? []

  const addMutation = useMutation({
    mutationFn: (questionId: string) => assessmentApi.addQuestionToAssessment(assessmentId, { questionId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assessment', assessmentId] }),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl h-[70vh] flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <h3 className="font-semibold flex-1">Add Questions</h3>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none w-48" />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {questions.map((q) => (
            <div key={q.id} className="flex items-start gap-3 p-3 border-b border-border hover:bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{q.type} · {q.difficulty} · {q.marks} pts</p>
              </div>
              <button onClick={() => addMutation.mutate(q.id)}
                disabled={addMutation.isPending}
                className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:opacity-90 disabled:opacity-50 shrink-0">
                Add
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No questions found</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function AssessmentBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [editingMeta, setEditingMeta] = useState(isNew)

  const [metaForm, setMetaForm] = useState({
    title: '', description: '', type: 'QUIZ' as AssessmentType,
    durationMins: '', passMark: '', instructions: '',
    shuffleQs: false, showAnswers: false,
    openDate: '', dueDate: '', allowLate: false,
  })

  const { data: assessmentData } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => assessmentApi.getAssessment(id!),
    enabled: !isNew,
  })

  const assessment: AssessmentDetail | null = (assessmentData as { data: AssessmentDetail } | undefined)?.data ?? null

  useEffect(() => {
    if (assessment && editingMeta) {
      const toLocal = (iso: string | null) => iso ? iso.slice(0, 16) : ''
      setMetaForm({
        title: assessment.title,
        description: assessment.description ?? '',
        type: assessment.type,
        durationMins: assessment.durationMins != null ? String(assessment.durationMins) : '',
        passMark: assessment.passMark != null ? String(assessment.passMark) : '',
        instructions: assessment.instructions ?? '',
        shuffleQs: assessment.shuffleQs,
        showAnswers: assessment.showAnswers,
        openDate: toLocal(assessment.openDate ?? null),
        dueDate: toLocal(assessment.dueDate ?? null),
        allowLate: assessment.allowLate,
      })
    }
  }, [assessment, editingMeta])

  const createMutation = useMutation({
    mutationFn: () => assessmentApi.createAssessment({
      title: metaForm.title,
      description: metaForm.description || undefined,
      type: metaForm.type,
      durationMins: metaForm.durationMins ? parseInt(metaForm.durationMins) : undefined,
      passMark: metaForm.passMark ? parseFloat(metaForm.passMark) : undefined,
      instructions: metaForm.instructions || undefined,
      shuffleQs: metaForm.shuffleQs,
      showAnswers: metaForm.showAnswers,
      openDate: metaForm.openDate || null,
      dueDate: metaForm.dueDate || null,
      allowLate: metaForm.allowLate,
    }),
    onSuccess: (res) => {
      const created = (res as { data: AssessmentDetail }).data
      void qc.invalidateQueries({ queryKey: ['assessments'] })
      navigate(ROUTES.ASSESSMENT_BUILDER.replace(':id', created.id))
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => assessmentApi.updateAssessment(id!, metaForm as unknown as Parameters<typeof assessmentApi.updateAssessment>[1]),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['assessment', id] })
      setEditingMeta(false)
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => assessmentApi.publishAssessment(id!),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assessment', id] }),
  })

  const removeQMutation = useMutation({
    mutationFn: (questionId: string) => assessmentApi.removeQuestionFromAssessment(id!, questionId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assessment', id] }),
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to={ROUTES.ASSESSMENT_LIST} className="text-sm text-muted-foreground hover:text-foreground">← Assessments</Link>
        <h1 className="text-xl font-bold text-foreground">
          {isNew ? 'New Assessment' : assessment?.title ?? 'Assessment Builder'}
        </h1>
        {assessment?.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            assessment.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' :
            assessment.status === 'ARCHIVED' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-800'
          }`}>{assessment.status}</span>
        )}
      </div>

      {/* Meta form */}
      {(isNew || editingMeta) && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground block mb-1">Title *</label>
              <input value={metaForm.title} onChange={(e) => setMetaForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Assessment title…"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Type</label>
              <select value={metaForm.type} onChange={(e) => setMetaForm((f) => ({ ...f, type: e.target.value as AssessmentType }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
                {ASSESSMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Duration (mins)</label>
              <input type="number" value={metaForm.durationMins} onChange={(e) => setMetaForm((f) => ({ ...f, durationMins: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Instructions</label>
            <textarea value={metaForm.instructions} onChange={(e) => setMetaForm((f) => ({ ...f, instructions: e.target.value }))}
              rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none resize-none" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={metaForm.shuffleQs} onChange={(e) => setMetaForm((f) => ({ ...f, shuffleQs: e.target.checked }))} />
              Shuffle questions
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={metaForm.showAnswers} onChange={(e) => setMetaForm((f) => ({ ...f, showAnswers: e.target.checked }))} />
              Show answers after submission
            </label>
          </div>

          {metaForm.type === 'ASSIGNMENT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Open Date</label>
                <input
                  type="datetime-local"
                  value={metaForm.openDate}
                  onChange={(e) => setMetaForm((f) => ({ ...f, openDate: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={metaForm.dueDate}
                  onChange={(e) => setMetaForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={metaForm.allowLate} onChange={(e) => setMetaForm((f) => ({ ...f, allowLate: e.target.checked }))} />
                  Allow late submissions
                </label>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => isNew ? createMutation.mutate() : updateMutation.mutate()}
              disabled={!metaForm.title.trim() || createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? 'Saving…' : isNew ? 'Create Assessment' : 'Save Details'}
            </button>
            {!isNew && <button onClick={() => setEditingMeta(false)} className="border border-border px-4 py-2 rounded-lg text-sm hover:bg-muted">Cancel</button>}
          </div>
        </div>
      )}

      {!isNew && assessment && !editingMeta && (
        <>
          {/* Summary bar */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{assessment.type} · {assessment._count?.questions ?? 0} questions · {assessment.totalMarks} marks</p>
                {assessment.durationMins && <p className="text-xs text-muted-foreground">Duration: {assessment.durationMins} mins</p>}
                {assessment.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(assessment.dueDate).toLocaleString()}
                    {assessment.allowLate && ' · Late submissions allowed'}
                  </p>
                )}
                {assessment.instructions && <p className="text-xs text-muted-foreground italic">"{assessment.instructions.slice(0, 80)}…"</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingMeta(true)} className="text-xs border border-border px-3 py-1.5 rounded hover:bg-muted">Edit</button>
                {assessment.status === 'DRAFT' && (
                  <button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50">
                    Publish
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Questions list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">Questions ({assessment.questions.length})</h2>
              <button onClick={() => setShowPicker(true)}
                className="text-sm text-primary hover:underline">+ Add Questions</button>
            </div>
            {assessment.questions.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <ClipboardList className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p>No questions yet</p>
                <button onClick={() => setShowPicker(true)} className="mt-2 text-sm text-primary hover:underline">Add questions from bank</button>
              </div>
            )}
            {assessment.questions.map((aq, idx) => (
              <div key={aq.id} className="flex items-start gap-3 p-4 border-b border-border last:border-0 hover:bg-muted/20">
                <span className="text-xs text-muted-foreground mt-1 w-6 shrink-0 text-right">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-2">{aq.question.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {aq.question.type} · {aq.question.difficulty} · {aq.marks ?? aq.question.marks} pts
                  </p>
                </div>
                <button onClick={() => { if (confirm('Remove from assessment?')) removeQMutation.mutate(aq.question.id) }}
                  className="text-xs text-red-500 hover:text-red-600 shrink-0">Remove</button>
              </div>
            ))}
          </div>
        </>
      )}

      {showPicker && id && id !== 'new' && (
        <QuestionPicker assessmentId={id} onClose={() => setShowPicker(false)} />
      )}
    </div>
  )
}
