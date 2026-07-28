import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { type ReactNode } from 'react'
import { FileEdit, ClipboardList, Pin, Target, BarChart2 } from 'lucide-react'
import { assessmentApi, type Assessment, type AssessmentType, type AssessmentStatus } from '../../../lib/api/assessment.api'
import { ROUTES } from '../../../constants/routes'

const TYPE_ICONS: Record<AssessmentType, ReactNode> = {
  QUIZ: <FileEdit className="h-6 w-6" />,
  EXAM: <ClipboardList className="h-6 w-6" />,
  ASSIGNMENT: <Pin className="h-6 w-6" />,
  PRACTICE: <Target className="h-6 w-6" />,
  SURVEY: <BarChart2 className="h-6 w-6" />,
}

const STATUS_COLORS: Record<AssessmentStatus, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-700',
}

export function AssessmentListPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [typeFilter, setTypeFilter] = useState<AssessmentType | ''>('')
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', { typeFilter, statusFilter, search, page }],
    queryFn: () => assessmentApi.listAssessments({
      type: typeFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
      page,
    }),
  })

  const { data: statsData } = useQuery({
    queryKey: ['assessment-stats'],
    queryFn: () => assessmentApi.assessmentStats(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.deleteAssessment(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assessments'] }),
  })

  const publishMutation = useMutation({
    mutationFn: (id: string) => assessmentApi.publishAssessment(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['assessments'] }),
  })

  const assessments: Assessment[] = (data as { data: Assessment[] } | undefined)?.data ?? []
  const totalPages: number = (data as { totalPages?: number } | undefined)?.totalPages ?? 1
  const stats = (statsData as { data: { total: number; byType: Array<{ type: string; _count: number }> } } | undefined)?.data

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assessments</h1>
          <p className="text-sm text-muted-foreground">{stats?.total ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Link to={ROUTES.QUESTION_BANK}
            className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
            Question Bank
          </Link>
          <button onClick={() => navigate(ROUTES.ASSESSMENT_BUILDER.replace(':id', 'new'))}
            className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm font-medium hover:opacity-90">
            + New Assessment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search…"
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none min-w-[160px]" />
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as AssessmentType | ''); setPage(1) }}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
          <option value="">All Types</option>
          {(['QUIZ', 'EXAM', 'ASSIGNMENT', 'PRACTICE', 'SURVEY'] as AssessmentType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as AssessmentStatus | ''); setPage(1) }}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
          <option value="">All Statuses</option>
          {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as AssessmentStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-muted rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && assessments.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium">No assessments yet</p>
          <button onClick={() => navigate(ROUTES.ASSESSMENT_BUILDER.replace(':id', 'new'))}
            className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm">
            Create First Assessment
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map((a) => (
          <div key={a.id} className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center text-muted-foreground">{TYPE_ICONS[a.type]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                {a.status}
              </span>
            </div>
            <Link to={ROUTES.ASSESSMENT_BUILDER.replace(':id', a.id)}
              className="block mt-2 font-semibold text-foreground hover:text-primary line-clamp-2">
              {a.title}
            </Link>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span>{a._count?.questions ?? 0} questions</span>
              <span>·</span>
              <span>{a.totalMarks} marks</span>
              {a.durationMins && <><span>·</span><span>{a.durationMins} min</span></>}
            </div>
            <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link to={ROUTES.ASSESSMENT_BUILDER.replace(':id', a.id)}
                className="text-xs text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary/5">
                Edit
              </Link>
              {a.status === 'DRAFT' && (
                <button onClick={() => publishMutation.mutate(a.id)}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700">
                  Publish
                </button>
              )}
              <button onClick={() => { if (confirm('Delete assessment?')) deleteMutation.mutate(a.id) }}
                className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded hover:bg-red-50 ml-auto">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
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
