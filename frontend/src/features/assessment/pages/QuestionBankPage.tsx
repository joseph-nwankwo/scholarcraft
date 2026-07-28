import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Check, HelpCircle } from 'lucide-react'
import { assessmentApi, type Question, type QuestionType, type BloomLevel, type DifficultyLevel } from '../../../lib/api/assessment.api'
import { ROUTES } from '../../../constants/routes'

const TYPE_COLORS: Record<QuestionType, string> = {
  MCQ: 'bg-blue-100 text-blue-800', SHORT_ANSWER: 'bg-purple-100 text-purple-800',
  LONG_ANSWER: 'bg-indigo-100 text-indigo-800', TRUE_FALSE: 'bg-green-100 text-green-800',
  FILL_BLANK: 'bg-yellow-100 text-yellow-800', MATCHING: 'bg-orange-100 text-orange-800',
  ESSAY: 'bg-pink-100 text-pink-800', CALCULATION: 'bg-teal-100 text-teal-800',
}

const DIFF_COLORS: Record<DifficultyLevel, string> = {
  EASY: 'text-green-600', MEDIUM: 'text-yellow-600', HARD: 'text-orange-600', VERY_HARD: 'text-red-600',
}

const BLOOM_LABELS: Record<BloomLevel, string> = {
  REMEMBER: 'Remember', UNDERSTAND: 'Understand', APPLY: 'Apply',
  ANALYSE: 'Analyse', EVALUATE: 'Evaluate', CREATE: 'Create',
}

const MOD_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800', REJECTED: 'bg-red-100 text-red-800',
  NEEDS_REVISION: 'bg-orange-100 text-orange-800',
}

function QuestionRow({ q, selected, onSelect, onAction }: {
  q: Question; selected: boolean
  onSelect: (id: string, val: boolean) => void
  onAction: (action: string, q: Question) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className={`flex items-start gap-3 p-4 border-b border-border hover:bg-muted/30 transition-colors ${selected ? 'bg-primary/5' : ''}`}>
      <input type="checkbox" checked={selected} onChange={(e) => onSelect(q.id, e.target.checked)}
        className="mt-1 rounded border-border shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground line-clamp-2">{q.text}</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[q.type]}`}>{q.type.replace('_', ' ')}</span>
          <span className={`text-xs font-medium ${DIFF_COLORS[q.difficulty]}`}>{q.difficulty}</span>
          <span className="text-xs text-muted-foreground">{BLOOM_LABELS[q.bloomLevel]}</span>
          {q.topic && <span className="text-xs text-muted-foreground">· {q.topic}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${MOD_COLORS[q.moderationStatus] ?? 'bg-muted'}`}>
            {q.moderationStatus.replace('_', ' ')}
          </span>
        </div>
        {q.type === 'MCQ' && q.options.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {q.options.slice(0, 2).map((o, i) => (
              <p key={i} className={`flex items-center gap-1 text-xs ${o.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                {o.isCorrect ? <Check className="h-3 w-3 shrink-0" /> : <span className="shrink-0">·</span>} {o.text}
              </p>
            ))}
            {q.options.length > 2 && <p className="text-xs text-muted-foreground">+{q.options.length - 2} more</p>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{q.marks} pt{q.marks !== 1 ? 's' : ''}</span>
        <div className="relative">
          <button onClick={() => setMenuOpen((m) => !m)} className="p-1 rounded hover:bg-muted text-muted-foreground">⋮</button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-popover border border-border rounded shadow-lg z-20">
              {[['edit', 'Edit'], ['duplicate', 'Duplicate'], ['submit', 'Submit for review'], ['delete', 'Delete']].map(([a, l]) => (
                <button key={a} onClick={() => { onAction(a, q); setMenuOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${a === 'delete' ? 'text-red-600' : ''}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function QuestionBankPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('')
  const [bloomFilter, setBloomFilter] = useState<BloomLevel | ''>('')
  const [diffFilter, setDiffFilter] = useState<DifficultyLevel | ''>('')
  const [modFilter, setModFilter] = useState('')
  const [page, setPage] = useState(1)

  const params = {
    search: search || undefined, type: typeFilter || undefined,
    bloomLevel: bloomFilter || undefined, difficulty: diffFilter || undefined,
    moderationStatus: modFilter as typeof modFilter || undefined, page,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['questions', params],
    queryFn: () => assessmentApi.listQuestions(params as Parameters<typeof assessmentApi.listQuestions>[0]),
  })

  const { data: statsData } = useQuery({
    queryKey: ['question-stats'],
    queryFn: () => assessmentApi.questionStats(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.deleteQuestion(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const dupMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.duplicateQuestion(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.submitForModeration(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['questions'] }),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => assessmentApi.bulkDeleteQuestions(ids),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['questions'] }); setSelected(new Set()) },
  })

  const questions: Question[] = (data as { data: Question[] } | undefined)?.data ?? []
  const totalPages: number = (data as { totalPages?: number } | undefined)?.totalPages ?? 1
  const stats = (statsData as { data: { total: number } } | undefined)?.data

  const toggleSelect = useCallback((id: string, val: boolean) => {
    setSelected((prev) => { const n = new Set(prev); val ? n.add(id) : n.delete(id); return n })
  }, [])

  const handleAction = useCallback((action: string, q: Question) => {
    if (action === 'edit') navigate(ROUTES.QUESTION_EDITOR.replace(':id', q.id))
    if (action === 'duplicate') dupMutation.mutate(q.id)
    if (action === 'submit') submitMutation.mutate(q.id)
    if (action === 'delete') { if (confirm('Delete this question?')) deleteMutation.mutate(q.id) }
  }, [navigate, dupMutation, submitMutation, deleteMutation])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Question Bank</h1>
          <p className="text-sm text-muted-foreground">{stats?.total ?? 0} questions</p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={() => { if (confirm(`Delete ${selected.size} questions?`)) bulkDeleteMutation.mutate([...selected]) }}
              className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">
              Delete {selected.size}
            </button>
          )}
          <Link to={ROUTES.MODERATION_QUEUE}
            className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
            Moderation
          </Link>
          <button onClick={() => navigate(ROUTES.QUESTION_EDITOR.replace(':id', 'new'))}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90">
            + New Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-6 py-3 border-b border-border bg-muted/30 flex-wrap shrink-0">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search questions…"
          className="border border-border rounded px-3 py-1.5 text-sm bg-background focus:outline-none w-48" />
        {([
          ['typeFilter', 'All Types', ['MCQ', 'SHORT_ANSWER', 'LONG_ANSWER', 'TRUE_FALSE', 'FILL_BLANK', 'MATCHING', 'ESSAY', 'CALCULATION'], setTypeFilter],
          ['bloom', 'All Bloom levels', ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE'], setBloomFilter],
          ['diff', 'All Difficulties', ['EASY', 'MEDIUM', 'HARD', 'VERY_HARD'], setDiffFilter],
          ['mod', 'All Statuses', ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'], setModFilter],
        ] as Array<[string, string, string[], (v: string) => void]>).map(([key, placeholder, opts, setter]) => (
          <select key={key} onChange={(e) => { setter(e.target.value); setPage(1) }}
            className="border border-border rounded px-2 py-1.5 text-sm bg-background focus:outline-none">
            <option value="">{placeholder}</option>
            {opts.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => <div key={i} className="h-20 border-b border-border bg-muted animate-pulse" />)}
          </div>
        )}
        {!isLoading && questions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64">
            <HelpCircle className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-lg font-medium">No questions found</p>
            <button onClick={() => navigate(ROUTES.QUESTION_EDITOR.replace(':id', 'new'))}
              className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
              Create First Question
            </button>
          </div>
        )}
        {questions.map((q) => (
          <QuestionRow key={q.id} q={q} selected={selected.has(q.id)}
            onSelect={toggleSelect} onAction={handleAction} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4 border-t border-border shrink-0">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">Next →</button>
        </div>
      )}
    </div>
  )
}
