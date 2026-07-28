import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { History, FileText, Clock, Search, ExternalLink } from 'lucide-react'
import { generationApi, type AIGenerationRecord } from '@/lib/api/generation.api'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Badge } from '@/components/design-system/display/Badge'
import { ROUTES, buildRoute } from '@/constants/routes'

const MODULE_LABELS: Record<string, string> = {
  'lecture-notes': 'Lecture Notes',
  'lesson-plan':   'Lesson Plan',
  'assignment':    'Assignment',
  'quiz':          'Quiz',
  'exam':          'Exam',
  'marking-scheme':'Marking Scheme',
  'presentation':  'Presentation',
  'course-outline':'Course Outline',
}

const PROVIDER_COLORS: Record<string, 'default' | 'success' | 'warning'> = {
  anthropic: 'default',
  openai: 'success',
  gemini: 'warning',
}

export default function GenerationHistoryPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [moduleType, setModuleType] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['gen-history', search, moduleType, page],
    queryFn: () => generationApi.getHistory({ search: search || undefined, moduleType: moduleType || undefined, page, limit: 25 }),
    staleTime: 30_000,
  })

  const records = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  function fmtTime(ms: number) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Generation History</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <TextField placeholder="Search documents…" value={search} leftIcon={<Search className="h-4 w-4" />}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="w-64" />
        <select value={moduleType} onChange={(e) => { setModuleType(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All types</option>
          {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium text-right">Tokens</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
              <th className="px-4 py-3 font-medium text-right">Date</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No generations yet. Head to AI Studio to get started.</td></tr>
            )}
            {records.map((r: AIGenerationRecord) => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate font-medium text-foreground">{r.document?.title ?? 'Untitled'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{MODULE_LABELS[r.moduleType] ?? r.moduleType}</td>
                <td className="px-4 py-3">
                  <Badge variant={PROVIDER_COLORS[r.provider] ?? 'default'} size="sm">{r.provider}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                  {(r.tokensInput + r.tokensOutput).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground tabular-nums flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />{fmtTime(r.durationMs)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {r.document?.id && (
                    <button onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: r.document!.id! }))}
                      className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
