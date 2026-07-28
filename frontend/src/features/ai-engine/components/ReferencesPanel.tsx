import { useState, useEffect } from 'react'
import { BookMarked, Search, ChevronDown, ChevronUp, Loader2, ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── CrossRef ──────────────────────────────────────────────────────────────────

interface CrossRefItem {
  title?:             string[]
  author?:            { given?: string; family: string }[]
  published?:         { 'date-parts': number[][] }
  DOI?:               string
  'container-title'?: string[]
  volume?:            string
  issue?:             string
  page?:              string
  'is-referenced-by-count'?: number
}

async function searchCrossRef(query: string, yearFilter: YearFilter): Promise<RefResult[]> {
  const filterParam = yearFilter === '5y'
    ? `&filter=from-pub-date:${new Date().getFullYear() - 5}`
    : yearFilter === '2y'
      ? `&filter=from-pub-date:${new Date().getFullYear() - 2}`
      : ''
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=8&sort=relevance${filterParam}&select=title,author,published,DOI,container-title,volume,issue,page,is-referenced-by-count`
  const res = await fetch(url, { headers: { 'User-Agent': 'LectureCraft (mailto:support@lecturecraft.ai)' } })
  if (!res.ok) throw new Error('CrossRef request failed')
  const data = await res.json() as { message: { items: CrossRefItem[] } }
  return data.message.items.map((p): RefResult => {
    const authors = (p.author ?? []).slice(0, 6).map(a => `${a.family}, ${(a.given ?? '').charAt(0)}.`).join(', ')
    const etAl   = (p.author?.length ?? 0) > 6 ? ', et al.' : ''
    const year   = p.published?.['date-parts']?.[0]?.[0] ?? 'n.d.'
    const title  = p.title?.[0] ?? 'Untitled'
    const jrnl   = p['container-title']?.[0] ?? ''
    const vol    = p.volume ? `, ${p.volume}` : ''
    const iss    = p.issue  ? `(${p.issue})`   : ''
    const pages  = p.page   ? `, ${p.page}`    : ''
    const doi    = p.DOI    ? `https://doi.org/${p.DOI}` : ''
    const cited  = p['is-referenced-by-count'] ?? 0
    const apa    = `${authors}${etAl} (${year}). ${title}. *${jrnl}*${vol}${iss}${pages}.${doi ? ` ${doi}` : ''}`
    return { id: p.DOI ?? `cr-${Math.random()}`, apa, title, year: String(year), journal: jrnl, doi, cited, source: 'CrossRef' }
  })
}

// ── Semantic Scholar ───────────────────────────────────────────────────────────

interface S2Paper {
  paperId: string
  title:   string
  authors: { name: string }[]
  year:    number | null
  externalIds: { DOI?: string; ArXiv?: string }
  citationCount: number
  journal: { name: string; volume?: string; pages?: string } | null
}

async function searchSemanticScholar(query: string, yearFilter: YearFilter): Promise<RefResult[]> {
  const yearParam = yearFilter === '5y'
    ? `&year=${new Date().getFullYear() - 5}-`
    : yearFilter === '2y'
      ? `&year=${new Date().getFullYear() - 2}-`
      : ''
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&fields=title,authors,year,externalIds,citationCount,journal&limit=8${yearParam}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Semantic Scholar request failed')
  const data = await res.json() as { data: S2Paper[] }
  return (data.data ?? []).map((p): RefResult => {
    const authNames = (p.authors ?? []).slice(0, 6)
    const authors   = authNames.map(a => {
      const parts = a.name.trim().split(' ')
      const last  = parts.pop() ?? ''
      const init  = parts.map(w => `${w[0]}.`).join(' ')
      return init ? `${last}, ${init}` : last
    }).join(', ')
    const etAl   = (p.authors?.length ?? 0) > 6 ? ', et al.' : ''
    const year   = p.year ?? 'n.d.'
    const title  = p.title ?? 'Untitled'
    const jrnl   = p.journal?.name ?? ''
    const vol    = p.journal?.volume ? `, ${p.journal.volume}` : ''
    const pages  = p.journal?.pages  ? `, ${p.journal.pages}`  : ''
    const doi    = p.externalIds?.DOI ? `https://doi.org/${p.externalIds.DOI}` : ''
    const apa    = `${authors}${etAl} (${year}). ${title}. *${jrnl}*${vol}${pages}.${doi ? ` ${doi}` : ''}`
    return { id: p.paperId, apa, title, year: String(year), journal: jrnl, doi, cited: p.citationCount ?? 0, source: 'Semantic Scholar' }
  })
}

// ── Shared types ──────────────────────────────────────────────────────────────

export interface RefResult {
  id:      string
  apa:     string
  title:   string
  year:    string
  journal: string
  doi:     string
  cited:   number
  source:  'CrossRef' | 'Semantic Scholar'
}

type YearFilter = 'all' | '5y' | '2y'
type Source     = 'crossref' | 's2'

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  topic:    string
  onSelect: (refs: string) => void
  disabled?: boolean
}

export function ReferencesPanel({ topic, onSelect, disabled }: Props) {
  const [open,    setOpen]    = useState(false)
  const [source,  setSource]  = useState<Source>('crossref')
  const [query,   setQuery]   = useState('')
  const [filter,  setFilter]  = useState<YearFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [results, setResults] = useState<RefResult[]>([])
  const [checked, setChecked] = useState<Set<string>>(new Set())

  // Pre-fill query from topic when panel opens
  useEffect(() => { if (open && !query && topic) setQuery(topic) }, [open])

  // Notify parent whenever selection changes
  useEffect(() => {
    const selected = results.filter(r => checked.has(r.id))
    if (selected.length === 0) { onSelect(''); return }
    const block = [
      '## Suggested References',
      '',
      'The following peer-reviewed papers are relevant to this topic. Where appropriate, incorporate and cite them in the generated content:',
      '',
      ...selected.map((r, i) => `${i + 1}. ${r.apa}`),
    ].join('\n')
    onSelect(block)
  }, [checked, results])

  async function runSearch() {
    if (!query.trim() || loading || disabled) return
    setLoading(true)
    setError(null)
    setResults([])
    setChecked(new Set())
    try {
      const items = source === 'crossref'
        ? await searchCrossRef(query.trim(), filter)
        : await searchSemanticScholar(query.trim(), filter)
      setResults(items)
      if (items.length === 0) setError('No papers found. Try a broader query.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearAll() {
    setResults([])
    setChecked(new Set())
    setError(null)
    onSelect('')
  }

  const selectedCount = checked.size

  return (
    <div className="rounded-xl border border-border bg-muted/20">
      {/* ── Header ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <BookMarked className="h-4 w-4 text-primary" />
          <span>Literature References</span>
          {selectedCount > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {selectedCount} selected
            </span>
          )}
        </div>
        {open
          ? <ChevronUp  className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
        }
      </button>

      {/* ── Collapsed pill summary ──────────────────────────── */}
      {!open && selectedCount > 0 && (
        <div className="border-t border-border px-4 pb-3 pt-2">
          <p className="text-[11px] text-muted-foreground">
            {selectedCount} reference{selectedCount !== 1 ? 's' : ''} will be included in the generation prompt.
          </p>
        </div>
      )}

      {/* ── Expanded panel ──────────────────────────────────── */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Search for peer-reviewed papers and select the ones you want the AI to incorporate and cite in the generated document.
          </p>

          {/* Source tabs */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5 w-fit">
            {(['crossref', 's2'] as Source[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { setSource(s); setResults([]); setChecked(new Set()); setError(null) }}
                className={cn(
                  'px-3 py-1 text-xs rounded-md transition-colors',
                  source === s ? 'bg-background shadow-sm text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'crossref' ? 'CrossRef' : 'Semantic Scholar'}
              </button>
            ))}
          </div>

          {/* Search row */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && void runSearch()}
              placeholder="Search by keyword or topic…"
              disabled={loading || disabled}
              className="flex-1 h-8 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={!query.trim() || loading || disabled}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 shrink-0"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search
            </button>
          </div>

          {/* Year filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Year:</span>
            {(['all', '5y', '2y'] as YearFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'text-[11px] px-2 py-0.5 rounded border transition-colors',
                  filter === f
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                {f === 'all' ? 'All time' : f === '5y' ? 'Last 5 yr' : 'Last 2 yr'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">{results.length} papers found via {source === 'crossref' ? 'CrossRef' : 'Semantic Scholar'}</p>
                {(selectedCount > 0 || results.length > 0) && (
                  <button type="button" onClick={clearAll} className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                    <X className="h-3 w-3" /> Clear
                  </button>
                )}
              </div>

              {results.map(r => (
                <label
                  key={r.id}
                  className={cn(
                    'flex gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors',
                    checked.has(r.id)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-muted/30',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(r.id)}
                    onChange={() => toggleCheck(r.id)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {r.year}{r.journal ? ` · ${r.journal}` : ''}
                      {r.cited > 0 ? ` · Cited ${r.cited}×` : ''}
                    </p>
                    {r.doi && (
                      <a
                        href={r.doi}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline mt-0.5"
                      >
                        View paper <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </label>
              ))}

              {selectedCount > 0 && (
                <p className="text-[11px] text-primary font-medium pt-1">
                  {selectedCount} reference{selectedCount !== 1 ? 's' : ''} selected — will be sent to the AI.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
