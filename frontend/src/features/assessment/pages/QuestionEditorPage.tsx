import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assessmentApi, type Question, type QuestionType, type BloomLevel, type DifficultyLevel, type QuestionOption } from '../../../lib/api/assessment.api'
import { ROUTES } from '../../../constants/routes'

const QUESTION_TYPES: QuestionType[] = ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'ESSAY', 'CALCULATION']
const BLOOM_LEVELS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']
const DIFFICULTIES: DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD']

const BLOOM_COLORS: Record<BloomLevel, string> = {
  REMEMBER: 'bg-gray-100 text-gray-700', UNDERSTAND: 'bg-blue-100 text-blue-700',
  APPLY: 'bg-green-100 text-green-700', ANALYSE: 'bg-yellow-100 text-yellow-700',
  EVALUATE: 'bg-orange-100 text-orange-700', CREATE: 'bg-purple-100 text-purple-700',
}

interface FormState {
  type: QuestionType
  bloomLevel: BloomLevel
  difficulty: DifficultyLevel
  text: string
  explanation: string
  marks: string
  topic: string
  subject: string
  tags: string
  isPublic: boolean
  options: Array<{ text: string; isCorrect: boolean; explanation: string }>
}

const DEFAULT_FORM: FormState = {
  type: 'MCQ', bloomLevel: 'REMEMBER', difficulty: 'MEDIUM',
  text: '', explanation: '', marks: '1', topic: '', subject: '', tags: '',
  isPublic: false,
  options: [
    { text: '', isCorrect: false, explanation: '' },
    { text: '', isCorrect: false, explanation: '' },
    { text: '', isCorrect: false, explanation: '' },
    { text: '', isCorrect: false, explanation: '' },
  ],
}

function OptionRow({ opt, idx, onChange, onRemove, type }: {
  opt: FormState['options'][0]; idx: number
  onChange: (idx: number, field: string, val: string | boolean) => void
  onRemove: (idx: number) => void
  type: QuestionType
}) {
  return (
    <div className="flex items-start gap-2 p-3 border border-border rounded-lg bg-muted/20">
      <div className="flex items-center gap-2 mt-1 shrink-0">
        <span className="text-xs text-muted-foreground w-4">{String.fromCharCode(65 + idx)}.</span>
        <input
          type={type === 'MCQ' ? 'radio' : 'checkbox'}
          checked={opt.isCorrect}
          onChange={(e) => {
            if (type === 'MCQ') {
              // Clear others on radio change — parent handles via onChange with special key
              onChange(idx, '_radio_correct', String(e.target.checked))
            } else {
              onChange(idx, 'isCorrect', e.target.checked)
            }
          }}
          className="shrink-0"
        />
      </div>
      <div className="flex-1 space-y-1.5">
        <input
          value={opt.text}
          onChange={(e) => onChange(idx, 'text', e.target.value)}
          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
          className="w-full border border-border rounded px-2 py-1 text-sm bg-background focus:outline-none"
        />
        {opt.isCorrect && (
          <input
            value={opt.explanation}
            onChange={(e) => onChange(idx, 'explanation', e.target.value)}
            placeholder="Explanation for this answer (optional)"
            className="w-full border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none text-muted-foreground"
          />
        )}
      </div>
      <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 mt-1 shrink-0 text-lg leading-none">×</button>
    </div>
  )
}

export function QuestionEditorPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)

  const { data: existingData } = useQuery({
    queryKey: ['question', id],
    queryFn: () => assessmentApi.getQuestion(id!),
    enabled: !isNew,
  })

  useEffect(() => {
    if (!existingData) return
    const q = (existingData as { data: Question }).data
    setForm({
      type: q.type, bloomLevel: q.bloomLevel, difficulty: q.difficulty,
      text: q.text, explanation: q.explanation ?? '',
      marks: String(q.marks), topic: q.topic ?? '', subject: q.subject ?? '',
      tags: q.tags.join(', '), isPublic: q.isPublic,
      options: q.options.length > 0
        ? q.options.map((o: QuestionOption) => ({ text: o.text, isCorrect: o.isCorrect, explanation: o.explanation ?? '' }))
        : DEFAULT_FORM.options,
    })
  }, [existingData])

  const createMutation = useMutation({
    mutationFn: (dto: Parameters<typeof assessmentApi.createQuestion>[0]) => assessmentApi.createQuestion(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] })
      navigate(ROUTES.QUESTION_BANK)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (dto: Parameters<typeof assessmentApi.updateQuestion>[1]) => assessmentApi.updateQuestion(id!, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['questions'] })
      void qc.invalidateQueries({ queryKey: ['question', id] })
      navigate(ROUTES.QUESTION_BANK)
    },
  })

  const needsOptions = ['MCQ', 'TRUE_FALSE', 'MATCHING'].includes(form.type)
  const isPending = createMutation.isPending || updateMutation.isPending

  const handleOptionChange = (idx: number, field: string, val: string | boolean) => {
    setForm((f) => {
      const opts = [...f.options]
      if (field === '_radio_correct') {
        return { ...f, options: opts.map((o, i) => ({ ...o, isCorrect: i === idx })) }
      }
      opts[idx] = { ...opts[idx], [field]: val }
      return { ...f, options: opts }
    })
  }

  const addOption = () => setForm((f) => ({ ...f, options: [...f.options, { text: '', isCorrect: false, explanation: '' }] }))
  const removeOption = (idx: number) => setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }))

  const handleSubmit = () => {
    if (!form.text.trim()) return
    const dto = {
      type: form.type, bloomLevel: form.bloomLevel, difficulty: form.difficulty,
      text: form.text, explanation: form.explanation || undefined,
      marks: parseFloat(form.marks) || 1,
      topic: form.topic || undefined, subject: form.subject || undefined,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      isPublic: form.isPublic,
      options: needsOptions ? form.options.filter((o) => o.text.trim()) : undefined,
    }
    if (isNew) createMutation.mutate(dto)
    else updateMutation.mutate(dto)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(ROUTES.QUESTION_BANK)} className="text-muted-foreground hover:text-foreground text-sm">← Bank</button>
        <h1 className="text-xl font-bold text-foreground">{isNew ? 'New Question' : 'Edit Question'}</h1>
      </div>

      <div className="space-y-5">
        {/* Type / Bloom / Difficulty row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            ['Type', 'type', QUESTION_TYPES],
            ['Bloom\'s Level', 'bloomLevel', BLOOM_LEVELS],
            ['Difficulty', 'difficulty', DIFFICULTIES],
          ] as Array<[string, keyof FormState, string[]]>).map(([label, key, opts]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground block mb-1">{label}</label>
              <select value={form[key] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value, ...(key === 'type' ? { options: DEFAULT_FORM.options } : {}) }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
                {opts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
              </select>
            </div>
          ))}
        </div>

        {/* Bloom badge preview */}
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${BLOOM_COLORS[form.bloomLevel]}`}>
            {form.bloomLevel}
          </span>
          <span className="text-xs text-muted-foreground">Bloom's taxonomy level</span>
        </div>

        {/* Question text */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Question Text *</label>
          <textarea
            value={form.text}
            onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
            rows={4}
            placeholder="Enter the question…"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* MCQ / TRUE_FALSE options */}
        {needsOptions && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Answer Options</label>
              <button onClick={addOption} className="text-xs text-primary hover:underline">+ Add option</button>
            </div>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <OptionRow key={i} opt={opt} idx={i} type={form.type}
                  onChange={handleOptionChange} onRemove={removeOption} />
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1">General Explanation / Model Answer</label>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            rows={3}
            placeholder="Explain the correct answer…"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Marks</label>
            <input type="number" min="0.5" step="0.5" value={form.marks}
              onChange={(e) => setForm((f) => ({ ...f, marks: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Topic</label>
            <input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="e.g. Photosynthesis"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Subject</label>
            <input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="e.g. Biology"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Tags (comma-separated)</label>
          <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            placeholder="e.g. midterm, Chapter 3"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="rounded border-border" />
          <span className="text-sm">Make visible to colleagues in my institution</span>
        </label>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSubmit} disabled={isPending || !form.text.trim()}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {isPending ? 'Saving…' : isNew ? 'Create Question' : 'Save Changes'}
          </button>
          <button onClick={() => navigate(ROUTES.QUESTION_BANK)}
            className="border border-border py-2 px-4 rounded-lg text-sm hover:bg-muted">
            Cancel
          </button>
        </div>

        {(createMutation.error ?? updateMutation.error) && (
          <p className="text-sm text-red-600">
            {((createMutation.error ?? updateMutation.error) as Error).message}
          </p>
        )}
      </div>
    </div>
  )
}
