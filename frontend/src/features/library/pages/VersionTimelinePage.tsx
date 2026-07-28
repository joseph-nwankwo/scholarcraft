import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { client } from '../../../lib/api/client'
import { ROUTES } from '../../../constants/routes'

interface Version {
  id: string
  versionNumber: number
  markdownContent: string
  changeNote: string | null
  wordCount: number | null
  createdAt: string
  creator?: { id: string; name: string }
}

export function VersionTimelinePage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [previewId, setPreviewId] = useState<string | null>(null)

  const { data: versionsData, isLoading } = useQuery({
    queryKey: ['doc-versions', id],
    queryFn: () => client.get<{ data: Version[] }>(`/documents/${id}/versions`),
    enabled: !!id,
  })

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) =>
      client.post(`/documents/${id}/versions/${versionId}/restore`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['doc-versions', id] })
      void qc.invalidateQueries({ queryKey: ['document', id] })
    },
  })

  const versions: Version[] = (versionsData as { data: Version[] } | undefined)?.data ?? []
  const preview = versions.find((v) => v.id === previewId)

  return (
    <div className="flex h-full">
      {/* Timeline */}
      <div className="w-80 border-r border-border flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm text-foreground">Version History</h2>
          <Link to={ROUTES.DOCUMENT_EDITOR.replace(':id', id ?? '')}
            className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to editor
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
            </div>
          )}
          {!isLoading && versions.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">No versions yet</p>
          )}
          <div className="relative">
            {/* Timeline spine */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            {versions.map((v, idx) => (
              <div key={v.id} className="relative pl-12 pr-4 py-3">
                {/* Dot */}
                <div className={`absolute left-[18px] top-4 w-3 h-3 rounded-full border-2 ${
                  idx === 0 ? 'bg-primary border-primary' : 'bg-background border-border'
                }`} />
                <button
                  onClick={() => setPreviewId(v.id === previewId ? null : v.id)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    previewId === v.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">v{v.versionNumber}</span>
                    {idx === 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Latest</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                  {v.creator && (
                    <p className="text-xs text-muted-foreground">by {v.creator.name}</p>
                  )}
                  {v.changeNote && (
                    <p className="text-xs text-foreground mt-1 italic">"{v.changeNote}"</p>
                  )}
                  {v.wordCount != null && (
                    <p className="text-xs text-muted-foreground">{v.wordCount} words</p>
                  )}
                </button>
                {idx > 0 && (
                  <button
                    onClick={() => { if (confirm(`Restore to version ${v.versionNumber}?`)) restoreMutation.mutate(v.id) }}
                    disabled={restoreMutation.isPending}
                    className="ml-2 text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        {id && versions.length >= 2 && (
          <div className="p-3 border-t border-border">
            <Link to={ROUTES.DOCUMENT_COMPARISON.replace(':id', id)}
              className="block w-full text-center text-sm border border-border py-2 rounded-lg hover:bg-muted">
              Compare Versions
            </Link>
          </div>
        )}
      </div>

      {/* Preview pane */}
      <div className="flex-1 overflow-y-auto">
        {!preview ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium">Select a version to preview</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">Version {preview.versionNumber}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(preview.createdAt).toLocaleString()}
                  {preview.creator && ` · ${preview.creator.name}`}
                </p>
              </div>
              {preview.changeNote && (
                <p className="text-sm text-muted-foreground italic">"{preview.changeNote}"</p>
              )}
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground">
                {preview.markdownContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
