import { useState } from 'react'
import { Plus, Copy, Check, BookMarked, Search, ExternalLink } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { cn } from '@/lib/utils'
import { formatCitation, type CitationStyle } from '../utils/citationFormat'
import { thesiscraftApi } from '@/lib/api/thesiscraft.api'
import type { useThesis } from '../hooks/useThesis'
import type { CitationType, LiteratureResult } from '@/lib/api/thesiscraft.api'

const TYPE_OPTIONS: { value: CitationType; label: string }[] = [
  { value: 'JOURNAL', label: 'Journal Article' },
  { value: 'BOOK', label: 'Book' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'CONFERENCE', label: 'Conference Paper' },
  { value: 'THESIS', label: 'Thesis/Dissertation' },
  { value: 'OTHER', label: 'Other' },
]

const emptyForm = { type: 'JOURNAL' as CitationType, authors: '', year: '', title: '', source: '', url: '' }

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function CitationsTab({ thesisState }: Props) {
  const { thesis, addCitation, removeCitation } = thesisState
  const [style, setStyle]           = useState<CitationStyle>('APA')
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(emptyForm)
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)

  const [showSearch, setShowSearch]     = useState(false)
  const [query, setQuery]               = useState('')
  const [preferLocal, setPreferLocal]   = useState(false)
  const [searching, setSearching]       = useState(false)
  const [searchError, setSearchError]   = useState('')
  const [searchResults, setSearchResults] = useState<LiteratureResult[] | null>(null)
  const [searchCountry, setSearchCountry] = useState('')
  const [originFilter, setOriginFilter] = useState<'all' | 'local' | 'foreign'>('all')
  const [addingKey, setAddingKey]       = useState<string | null>(null)

  if (!thesis) return null

  async function handleLiteratureSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearchError('')
    setSearching(true)
    setOriginFilter('all')
    try {
      const { results, country } = await thesiscraftApi.literatureSearch(query.trim(), preferLocal)
      setSearchResults(results)
      setSearchCountry(country)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSearchError(msg ?? 'Could not search literature right now. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const filteredResults = searchResults?.filter((r) => originFilter === 'all' || r.origin === originFilter) ?? []
  const localCount = searchResults?.filter((r) => r.origin === 'local').length ?? 0
  const foreignCount = searchResults?.filter((r) => r.origin === 'foreign').length ?? 0

  async function handleAddFromSearch(result: LiteratureResult) {
    const key = `${result.provider}:${result.title}`
    setAddingKey(key)
    try {
      await addCitation({
        type:   'JOURNAL',
        authors: result.authors,
        year:    result.year,
        title:   result.title,
        source:  result.venue ?? undefined,
        url:     result.url ?? undefined,
      })
    } finally {
      setAddingKey(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.authors.trim() || !form.title.trim()) return
    setSaving(true)
    try {
      await addCitation({
        type: form.type,
        authors: form.authors.trim(),
        year: form.year ? Number(form.year) : null,
        title: form.title.trim(),
        source: form.source.trim() || undefined,
        url: form.url.trim() || undefined,
      })
      setForm(emptyForm)
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Citations & References</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{thesis.citations.length} reference{thesis.citations.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted">
            {(['APA', 'MLA', 'Harvard'] as CitationStyle[]).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  style === s ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s}
              </button>
            ))}
          </div>
          {!showSearch && (
            <Button variant="outline" leftIcon={<Search className="h-4 w-4" />} onClick={() => setShowSearch(true)}>Find Sources</Button>
          )}
          {!showForm && (
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>Add Citation</Button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Find Sources — CrossRef & Semantic Scholar</h3>
            <button onClick={() => { setShowSearch(false); setSearchResults(null) }} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <form onSubmit={handleLiteratureSearch} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <TextField label="Search" hideLabel value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. gamification and student engagement" />
              </div>
              <Button type="submit" loading={searching} leftIcon={<Search className="h-4 w-4" />}>Search</Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
              <input type="checkbox" checked={preferLocal} onChange={(e) => setPreferLocal(e.target.checked)} className="accent-primary" />
              Prioritize sources from my country in this search
            </label>
          </form>

          {searchError && <Alert variant="warning" description={searchError} />}

          {searchResults && (
            <>
              <p className="text-xs text-muted-foreground">
                Searching as: {searchCountry}. "Local"/"Foreign" is a keyword-match heuristic (checks for the country name or domain in
                the title, venue, publisher, or URL) — not an authoritative signal.
              </p>

              {searchResults.length > 0 && (
                <div className="flex gap-2">
                  {([
                    { key: 'all' as const, label: `All (${searchResults.length})` },
                    { key: 'local' as const, label: `Local (${localCount})` },
                    { key: 'foreign' as const, label: `Foreign (${foreignCount})` },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setOriginFilter(key)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                        originFilter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results found.</p>
              ) : filteredResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">No results in this filter.</p>
              ) : (
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredResults.map((result) => {
                    const key = `${result.provider}:${result.title}`
                    return (
                      <li key={key} className="rounded-lg bg-muted/50 p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{result.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {result.authors}{result.year ? ` · ${result.year}` : ''}{result.venue ? ` · ${result.venue}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="default" size="sm">{result.provider === 'crossref' ? 'CrossRef' : 'Semantic Scholar'}</Badge>
                            {result.origin !== 'unknown' && (
                              <Badge variant={result.origin === 'local' ? 'success' : 'outline'} size="sm">
                                {result.origin === 'local' ? 'Local' : 'Foreign'}
                              </Badge>
                            )}
                            {result.url && (
                              <a href={result.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" loading={addingKey === key} leftIcon={<Plus className="h-3.5 w-3.5" />} onClick={() => handleAddFromSearch(result)} className="shrink-0">
                          Add
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Type" value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as CitationType }))} options={TYPE_OPTIONS} />
            <TextField label="Year" type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} placeholder="e.g. 2023" />
          </div>
          <TextField label="Authors" value={form.authors} onChange={(e) => setForm((p) => ({ ...p, authors: e.target.value }))} placeholder="e.g. Smith, J., & Doe, A." required autoFocus />
          <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title of the work" required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Source" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="Journal, publisher, or website name" />
            <TextField label="URL" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} placeholder="Optional link" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>Add Citation</Button>
            <Button type="button" variant="secondary" onClick={() => { setShowForm(false); setForm(emptyForm) }}>Cancel</Button>
          </div>
        </form>
      )}

      {thesis.citations.length === 0 && !showForm ? (
        <EmptyState
          icon={<BookMarked className="h-7 w-7" />}
          title="No citations yet"
          description="Add references as you go, and switch between APA, MLA, and Harvard formatting anytime."
          action={{ label: 'Add Citation', onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <ul className="space-y-2">
          {thesis.citations.map((citation) => {
            const formatted = formatCitation(citation, style)
            return (
              <li key={citation.id} className="rounded-xl border bg-card p-4 shadow-card flex items-start justify-between gap-4">
                <p className="text-sm text-foreground leading-relaxed">{formatted}</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleCopy(citation.id, formatted)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors" title="Copy citation">
                    {copiedId === citation.id ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setDeletingId(citation.id)} className="text-xs text-muted-foreground hover:text-error font-medium">
                    Delete
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this citation?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await removeCitation(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}
