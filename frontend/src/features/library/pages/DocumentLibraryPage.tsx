import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Pin, Star, Trash2, Link2, CheckCircle2, Upload, FileText } from 'lucide-react'
import { libraryApi, type LibraryDocument, type LibraryStats, type Tag } from '../../../lib/api/library.api'
import { FolderTree } from '../components/FolderTree'
import { ROUTES, buildRoute } from '../../../constants/routes'

const TYPE_LABELS: Record<string, string> = {
  LECTURE_NOTE:   'Lecture Notes',
  LESSON_PLAN:    'Lesson Plan',
  QUESTION_SET:   'Question Set',
  ASSIGNMENT:     'Assignment',
  QUIZ:           'Quiz',
  EXAM:           'Exam',
  RUBRIC:         'Rubric',
  MARKING_SCHEME: 'Marking Scheme',
  COURSE_OUTLINE: 'Course Outline',
  PRESENTATION:   'Presentation',
  UPLOADED:       'Uploaded Document',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800', PUBLISHED: 'bg-green-100 text-green-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800', ARCHIVED: 'bg-gray-100 text-gray-700',
}

function DocCard({ doc, onAction }: { doc: LibraryDocument; onAction: (action: string, doc: LibraryDocument) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link to={buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: doc.id })} className="font-medium text-foreground hover:text-primary truncate block">
            {doc.title}
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <span className="text-xs text-muted-foreground">{TYPE_LABELS[doc.type] ?? doc.type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status] ?? 'bg-muted text-muted-foreground'}`}>
              {doc.status}
            </span>
            {doc.isPinned && <span title="Pinned"><Pin className="h-3.5 w-3.5 text-primary" /></span>}
            {doc.isFavorited && <span title="Favorited"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /></span>}
          </div>
          {(doc.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {doc.tags!.map(({ tag }) => (
                <span key={tag.id} className="text-xs px-1.5 py-0.5 rounded-full border border-border"
                  style={tag.color ? { borderColor: tag.color, color: tag.color } : {}}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen((m) => !m)}
            className="p-1 rounded hover:bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border rounded shadow-lg z-20">
              {[
                ['pin', doc.isPinned ? 'Unpin' : 'Pin'],
                ['favorite', doc.isFavorited ? 'Unfavorite' : 'Favorite'],
                ['trash', 'Move to Trash'],
              ].map(([action, label]) => (
                <button key={action} onClick={() => { onAction(action, doc); setMenuOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${action === 'trash' ? 'text-red-600' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
        <span>·</span>
        <span>{doc.viewCount} views</span>
      </div>
    </div>
  )
}

export function DocumentLibraryPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [page, setPage] = useState(1)

  const params = {
    folderId: selectedFolder,
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    favorites: showFavorites || undefined,
    page,
    limit: 24,
  }

  const { data: listData, isLoading } = useQuery({
    queryKey: ['library', params],
    queryFn: () => libraryApi.list(params),
  })

  const { data: statsData } = useQuery({
    queryKey: ['library-stats'],
    queryFn: () => libraryApi.stats(),
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: () => libraryApi.listTags(),
  })

  const pinMutation = useMutation({
    mutationFn: ({ id, pin }: { id: string; pin: boolean }) => libraryApi.pin(id, pin),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['library'] }),
  })

  const favMutation = useMutation({
    mutationFn: ({ id, add }: { id: string; add: boolean }) => libraryApi.favorite(id, add),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['library'] }),
  })

  const trashMutation = useMutation({
    mutationFn: (id: string) => libraryApi.trash(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['library'] })
      void qc.invalidateQueries({ queryKey: ['library-stats'] })
    },
  })

  const handleAction = useCallback((action: string, doc: LibraryDocument) => {
    if (action === 'pin') pinMutation.mutate({ id: doc.id, pin: !doc.isPinned })
    if (action === 'favorite') favMutation.mutate({ id: doc.id, add: !doc.isFavorited })
    if (action === 'trash') trashMutation.mutate(doc.id)
  }, [pinMutation, favMutation, trashMutation])

  const docs: LibraryDocument[] = (listData as { data: LibraryDocument[] } | undefined)?.data ?? []
  const stats: LibraryStats = (statsData as { data: LibraryStats } | undefined)?.data ?? { total: 0, pinned: 0, drafts: 0, published: 0, trashed: 0, favorites: 0 }
  const totalPages: number = (listData as { totalPages?: number } | undefined)?.totalPages ?? 1
  const tags: Tag[] = (tagsData as { data: Tag[] } | undefined)?.data ?? []

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex-col flex shrink-0 bg-card">
        <FolderTree selectedId={selectedFolder} onSelect={setSelectedFolder} />
        <div className="border-t border-border p-3 space-y-1 text-sm">
          <button onClick={() => setShowFavorites((f) => !f)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${showFavorites ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}>
            <Star className="h-4 w-4 shrink-0" /> Favorites <span className="ml-auto text-xs text-muted-foreground">{stats.favorites}</span>
          </button>
          <Link to={ROUTES.LIBRARY_TRASH}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground">
            <Trash2 className="h-4 w-4 shrink-0" /> Trash <span className="ml-auto text-xs text-muted-foreground">{stats.trashed}</span>
          </Link>
          <Link to={ROUTES.LIBRARY_SHARED}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground">
            <Link2 className="h-4 w-4 shrink-0" /> Shared
          </Link>
          <Link to={ROUTES.APPROVAL_QUEUE}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> Approvals
          </Link>
          <Link to={ROUTES.EXPORT_CENTER}
            className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-foreground">
            <Upload className="h-4 w-4 shrink-0" /> Exports
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-background shrink-0 flex-wrap">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search documents…"
            className="flex-1 min-w-[180px] border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
            <option value="">All Statuses</option>
            {['DRAFT', 'PUBLISHED', 'UNDER_REVIEW', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => navigate(ROUTES.AI_STUDIO)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 shrink-0">
            + Generate
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 px-4 py-2 bg-muted/40 border-b border-border text-xs text-muted-foreground">
          {[['Total', stats.total], ['Pinned', stats.pinned], ['Drafts', stats.drafts], ['Published', stats.published]].map(([l, v]) => (
            <span key={l}>{l}: <strong className="text-foreground">{v}</strong></span>
          ))}
          {tags.length > 0 && (
            <div className="flex gap-1 ml-auto flex-wrap">
              {tags.slice(0, 5).map((t) => (
                <span key={t.id} className="px-1.5 py-0.5 rounded-full border border-border cursor-pointer hover:bg-muted">
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && docs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium text-foreground">No documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search ? 'Try a different search' : 'Generate your first document with AI Studio'}
              </p>
              <button onClick={() => navigate(ROUTES.AI_STUDIO)}
                className="mt-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm hover:opacity-90">
                Open AI Studio
              </button>
            </div>
          )}
          {!isLoading && docs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map((doc) => (
                <DocCard key={doc.id} doc={doc} onAction={handleAction} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted">
                Next →
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
