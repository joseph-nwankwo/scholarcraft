import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { libraryApi, type ApprovalWorkflow } from '../../../lib/api/library.api'

const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted', PROGRAMME_COORDINATOR: 'Programme Coordinator',
  HOD: 'HOD', DEAN: 'Dean', ADMINISTRATOR: 'Administrator',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CHANGES_REQUESTED: 'bg-orange-100 text-orange-800',
}

function WorkflowCard({ workflow }: { workflow: ApprovalWorkflow }) {
  const qc = useQueryClient()
  const [comments, setComments] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | 'changes' | null>(null)

  const approveMutation = useMutation({
    mutationFn: () => libraryApi.approveWorkflow(workflow.id, comments || undefined),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['approval-queue'] }); setAction(null); setComments('') },
  })

  const rejectMutation = useMutation({
    mutationFn: () => libraryApi.rejectWorkflow(workflow.id, comments || undefined),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['approval-queue'] }); setAction(null); setComments('') },
  })

  const changesMutation = useMutation({
    mutationFn: () => libraryApi.requestChanges(workflow.id, comments),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['approval-queue'] }); setAction(null); setComments('') },
  })

  const isPending = approveMutation.isPending || rejectMutation.isPending || changesMutation.isPending

  const handleSubmit = () => {
    if (action === 'approve') approveMutation.mutate()
    else if (action === 'reject') rejectMutation.mutate()
    else if (action === 'changes') { if (!comments.trim()) return; changesMutation.mutate() }
  }

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{workflow.document.title}</h3>
          <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
            <span className="text-muted-foreground">{workflow.document.type}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">By {workflow.document.user.name}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">Submitted {new Date(workflow.submittedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[workflow.status] ?? 'bg-muted text-muted-foreground'}`}>
            {workflow.status}
          </span>
          <span className="text-xs text-muted-foreground">{STAGE_LABELS[workflow.currentStage] ?? workflow.currentStage}</span>
        </div>
      </div>

      {workflow.comments && (
        <div className="mt-3 p-3 bg-muted/50 rounded text-sm text-muted-foreground">
          <strong className="text-foreground">Comments: </strong>{workflow.comments}
        </div>
      )}

      {workflow.status === 'PENDING' && (
        <div className="mt-4 space-y-3">
          {!action && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAction('approve')}
                className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700">
                Approve
              </button>
              <button onClick={() => setAction('changes')}
                className="text-sm bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600">
                Request Changes
              </button>
              <button onClick={() => setAction('reject')}
                className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700">
                Reject
              </button>
            </div>
          )}

          {action && (
            <div className="space-y-2">
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder={action === 'changes' ? 'Describe required changes (required)…' : 'Add comments (optional)…'}
                className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={isPending || (action === 'changes' && !comments.trim())}
                  className={`text-sm px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-50 ${
                    action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    action === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                  }`}>
                  {isPending ? 'Saving…' : action === 'approve' ? 'Confirm Approve' : action === 'reject' ? 'Confirm Reject' : 'Submit Changes Request'}
                </button>
                <button onClick={() => { setAction(null); setComments('') }}
                  className="text-sm border border-border px-4 py-1.5 rounded-lg hover:bg-muted">
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

export function ApprovalQueuePage() {
  const [stageFilter, setStageFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['approval-queue', stageFilter],
    queryFn: () => libraryApi.getApprovalQueue(stageFilter || undefined),
  })

  const workflows: ApprovalWorkflow[] = (data as { data: ApprovalWorkflow[] } | undefined)?.data ?? []
  const pending = workflows.filter((w) => w.status === 'PENDING').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pending} pending review{pending !== 1 ? 's' : ''}
          </p>
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
          <option value="">All Stages</option>
          {Object.entries(STAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)}
        </div>
      )}

      {!isLoading && workflows.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium">No items in queue</p>
          <p className="text-sm">All caught up!</p>
        </div>
      )}

      <div className="space-y-4">
        {workflows.map((wf) => <WorkflowCard key={wf.id} workflow={wf} />)}
      </div>
    </div>
  )
}
