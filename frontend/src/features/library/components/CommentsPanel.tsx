import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { libraryApi, type Comment } from '../../../lib/api/library.api'

interface CommentsPanelProps {
  documentId: string
}

function CommentItem({
  comment,
  documentId,
  depth = 0,
}: {
  comment: Comment
  documentId: string
  depth?: number
}) {
  const qc = useQueryClient()
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')

  const replyMutation = useMutation({
    mutationFn: (content: string) => libraryApi.createComment(documentId, content, comment.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', documentId] })
      setReplying(false)
      setReplyText('')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () =>
      comment.isResolved ? libraryApi.unresolveComment(comment.id) : libraryApi.resolveComment(comment.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', documentId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => libraryApi.deleteComment(comment.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['comments', documentId] }),
  })

  return (
    <div style={{ marginLeft: depth > 0 ? '20px' : '0' }} className="border-b border-border last:border-0">
      <div className={`p-3 ${comment.isResolved ? 'opacity-50' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
            {comment.user.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-foreground">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-foreground ml-8">{comment.content}</p>
        <div className="flex items-center gap-3 ml-8 mt-1.5">
          {depth === 0 && (
            <button
              onClick={() => setReplying((r) => !r)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reply
            </button>
          )}
          <button
            onClick={() => resolveMutation.mutate()}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {comment.isResolved ? 'Unresolve' : 'Resolve'}
          </button>
          <button
            onClick={() => { if (confirm('Delete comment?')) deleteMutation.mutate() }}
            className="text-xs text-red-500 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {replying && (
        <div className="px-3 pb-3 ml-8">
          <textarea
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            placeholder="Write a reply…"
            className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => { if (replyText.trim()) replyMutation.mutate(replyText.trim()) }}
              disabled={replyMutation.isPending}
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:opacity-90 disabled:opacity-50"
            >
              Reply
            </button>
            <button onClick={() => { setReplying(false); setReplyText('') }} className="text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {(comment.replies ?? []).map((reply) => (
        <CommentItem key={reply.id} comment={reply} documentId={documentId} depth={depth + 1} />
      ))}
    </div>
  )
}

export function CommentsPanel({ documentId }: CommentsPanelProps) {
  const qc = useQueryClient()
  const [newComment, setNewComment] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['comments', documentId],
    queryFn: () => libraryApi.listComments(documentId),
  })

  const createMutation = useMutation({
    mutationFn: (content: string) => libraryApi.createComment(documentId, content),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', documentId] })
      setNewComment('')
    },
  })

  const comments: Comment[] = (data as { data: Comment[] } | undefined)?.data ?? []
  const resolved = comments.filter((c) => c.isResolved).length

  return (
    <div className="flex flex-col h-full border-l border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="font-semibold text-sm">Comments</h3>
        <span className="text-xs text-muted-foreground">{resolved}/{comments.length} resolved</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {!isLoading && comments.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No comments yet</div>
        )}
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} documentId={documentId} />
        ))}
      </div>

      <div className="p-3 border-t border-border shrink-0">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add a comment…"
          className="w-full text-sm border border-border rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <button
          onClick={() => { if (newComment.trim()) createMutation.mutate(newComment.trim()) }}
          disabled={createMutation.isPending || !newComment.trim()}
          className="mt-1 w-full text-sm bg-primary text-primary-foreground py-1.5 rounded hover:opacity-90 disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </div>
  )
}
