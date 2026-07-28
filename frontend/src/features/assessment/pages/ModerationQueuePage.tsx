import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { assessmentApi, type QuestionModeration, type ModerationStatus } from '../../../lib/api/assessment.api'

const STATUS_COLORS: Record<ModerationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  NEEDS_REVISION: 'bg-orange-100 text-orange-800',
}

type ExtendedModeration = QuestionModeration & {
  question?: {
    id: string; text: string; type: string; bloomLevel: string; difficulty: string; marks: number
    creator?: { id: string; name: string }
    options?: Array<{ text: string; isCorrect: boolean }>
    course?: { code: string; title: string } | null
  }
}

function ModerationCard({ mod }: { mod: ExtendedModeration }) {
  const qc = useQueryClient()
  const [action, setAction] = useState<'approve' | 'reject' | 'revise' | null>(null)
  const [feedback, setFeedback] = useState('')
  const q = mod.question

  const approveMutation = useMutation({
    mutationFn: () => assessmentApi.approveQuestion(mod.questionId, feedback || undefined),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['moderation-queue'] }); setAction(null); setFeedback('') },
  })

  const rejectMutation = useMutation({
    mutationFn: () => assessmentApi.rejectQuestion(mod.questionId, feedback),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['moderation-queue'] }); setAction(null); setFeedback('') },
  })

  const reviseMutation = useMutation({
    mutationFn: () => assessmentApi.requestRevision(mod.questionId, feedback),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['moderation-queue'] }); setAction(null); setFeedback('') },
  })

  const isPending = approveMutation.isPending || rejectMutation.isPending || reviseMutation.isPending

  const handleSubmit = () => {
    if (action === 'approve') approveMutation.mutate()
    else if (action === 'reject') rejectMutation.mutate()
    else if (action === 'revise') reviseMutation.mutate()
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{q?.text ?? mod.questionId}</p>
          <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
            {q?.type && <span className="bg-muted px-1.5 py-0.5 rounded">{q.type}</span>}
            {q?.difficulty && <span>{q.difficulty}</span>}
            {q?.bloomLevel && <span>{q.bloomLevel}</span>}
            {q?.marks && <span>{q.marks} pts</span>}
            {q?.creator && <span>by {q.creator.name}</span>}
            {q?.course && <span>· {q.course.code}</span>}
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${STATUS_COLORS[mod.status]}`}>
          {mod.status.replace('_', ' ')}
        </span>
      </div>

      {q?.type === 'MCQ' && q.options && q.options.length > 0 && (
        <div className="mb-3 space-y-1">
          {q.options.map((o, i) => (
            <p key={i} className={`text-xs ${o.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
              {String.fromCharCode(65 + i)}. {o.text}
            </p>
          ))}
        </div>
      )}

      {mod.feedback && (
        <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
          <strong>Previous feedback:</strong> {mod.feedback}
        </div>
      )}

      {mod.status === 'PENDING_REVIEW' && (
        <div className="space-y-3">
          {!action && (
            <div className="flex gap-2">
              <button onClick={() => setAction('approve')}
                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700">Approve</button>
              <button onClick={() => setAction('revise')}
                className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded hover:bg-orange-600">Request Revision</button>
              <button onClick={() => setAction('reject')}
                className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700">Reject</button>
            </div>
          )}
          {action && (
            <div className="space-y-2">
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                placeholder={action === 'approve' ? 'Optional feedback…' : 'Feedback (required)…'}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmit}
                  disabled={isPending || ((action === 'reject' || action === 'revise') && !feedback.trim())}
                  className={`text-sm px-4 py-1.5 rounded text-white font-medium disabled:opacity-50 ${
                    action === 'approve' ? 'bg-green-600' : action === 'reject' ? 'bg-red-600' : 'bg-orange-500'
                  }`}>
                  {isPending ? 'Saving…' : 'Confirm'}
                </button>
                <button onClick={() => { setAction(null); setFeedback('') }}
                  className="text-sm border border-border px-4 py-1.5 rounded hover:bg-muted">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ModerationQueuePage() {
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | ''>('PENDING_REVIEW')

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-queue', statusFilter],
    queryFn: () => assessmentApi.getModerationQueue(statusFilter || undefined),
  })

  const { data: statsData } = useQuery({
    queryKey: ['moderation-stats'],
    queryFn: () => assessmentApi.moderationStats(),
  })

  const mods: ExtendedModeration[] = (data as { data: ExtendedModeration[] } | undefined)?.data ?? []
  const stats = (statsData as { data: { pending: number; approved: number; rejected: number; needsRevision: number } } | undefined)?.data

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Moderation Queue</h1>
          {stats && (
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              <span className="text-yellow-600 font-medium">{stats.pending} pending</span>
              <span>·</span>
              <span className="text-green-600">{stats.approved} approved</span>
              <span>·</span>
              <span className="text-orange-600">{stats.needsRevision} needs revision</span>
              <span>·</span>
              <span className="text-red-600">{stats.rejected} rejected</span>
            </div>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ModerationStatus | '')}
          className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none">
          <option value="">All Statuses</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NEEDS_REVISION">Needs Revision</option>
        </select>
      </div>

      {isLoading && (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />)}</div>
      )}

      {!isLoading && mods.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium">Queue is empty</p>
          <p className="text-sm">No questions matching the selected status</p>
        </div>
      )}

      <div className="space-y-4">
        {mods.map((mod) => <ModerationCard key={mod.id} mod={mod} />)}
      </div>
    </div>
  )
}
