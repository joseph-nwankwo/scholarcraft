import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { libraryApi, type LibraryDocument } from '../../../lib/api/library.api'

export function TrashPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ['library-trash'],
    queryFn: () => libraryApi.list({ isTrashed: true, limit: 100 }),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => libraryApi.restore(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['library-trash'] }),
  })

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => libraryApi.permanentDelete(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['library-trash'] }),
  })

  const emptyTrashMutation = useMutation({
    mutationFn: () => libraryApi.emptyTrash(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library-trash'] })
      void qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
  })

  const docs: LibraryDocument[] = (data as { data: LibraryDocument[] } | undefined)?.data ?? []

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trash</h1>
          <p className="text-sm text-muted-foreground mt-1">Documents trashed more than 30 days ago are permanently deleted automatically.</p>
        </div>
        {docs.length > 0 && (
          <button
            onClick={() => { if (confirm('Permanently delete all trashed documents?')) emptyTrashMutation.mutate() }}
            disabled={emptyTrashMutation.isPending}
            className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            Empty Trash
          </button>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && docs.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Trash2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-lg font-medium text-foreground">Trash is empty</p>
          <p className="text-sm text-muted-foreground">Deleted documents will appear here</p>
        </div>
      )}

      <div className="space-y-2">
        {docs.map((doc) => (
          <div key={doc.id} className={`flex items-center gap-3 p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow ${selected.has(doc.id) ? 'ring-1 ring-primary' : ''}`}>
            <input
              type="checkbox"
              checked={selected.has(doc.id)}
              onChange={() => toggleSelect(doc.id)}
              className="rounded border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{doc.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {doc.type} · Trashed {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : ''}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => restoreMutation.mutate(doc.id)}
                disabled={restoreMutation.isPending}
                className="text-xs text-primary border border-primary/30 px-3 py-1 rounded hover:bg-primary/5 disabled:opacity-50"
              >
                Restore
              </button>
              <button
                onClick={() => { if (confirm('Permanently delete this document?')) permanentDeleteMutation.mutate(doc.id) }}
                disabled={permanentDeleteMutation.isPending}
                className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50 disabled:opacity-50"
              >
                Delete forever
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
