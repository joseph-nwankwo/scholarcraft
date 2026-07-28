import { useState, useRef, useEffect, useCallback } from 'react'
import {
  FlaskConical, Send, Square, RotateCcw, Copy, Check,
  Sparkles, BookMarked, FileSearch, Microscope, Network,
  Upload, X, XCircle, Loader2, FileText, File, ExternalLink, ChevronDown,
  BookOpen, Trash2, Download, Search, Calendar,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/design-system/buttons/Button'
import { cn } from '@/lib/utils'
import { ROUTES, buildRoute } from '@/constants/routes'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id:         string
  role:       'user' | 'assistant'
  content:    string
  timestamp:  Date
  documentId?: string
}

interface UploadedPaper {
  filename: string
  chars:    number
  text:     string
}

interface SavedCitation {
  id:      string
  text:    string
  savedAt: string // ISO
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CITATIONS_KEY  = 'ra-citations'

// ── CrossRef types & helpers ───────────────────────────────────────────────────

interface CrossRefItem {
  title?:             string[]
  author?:            { given?: string; family: string }[]
  published?:         { 'date-parts': number[][] }
  DOI?:               string
  'container-title'?: string[]
  volume?:            string
  issue?:             string
  page?:              string
  abstract?:          string
  'is-referenced-by-count'?: number
}

type LitFilter = 'all' | '5y' | '2y'

async function fetchCrossRef(query: string, filter: LitFilter): Promise<CrossRefItem[]> {
  const filterParam = filter === '5y'
    ? `&filter=from-pub-date:${new Date().getFullYear() - 5}`
    : filter === '2y'
      ? `&filter=from-pub-date:${new Date().getFullYear() - 2}`
      : ''
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=7&sort=relevance${filterParam}&select=title,author,published,DOI,container-title,volume,issue,page,is-referenced-by-count`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'LectureCraft (mailto:support@lecturecraft.ai)' },
  })
  if (!res.ok) throw new Error('CrossRef request failed')
  const data = await res.json() as { message: { items: CrossRefItem[] } }
  return data.message.items
}

function toAPA(p: CrossRefItem): string {
  const authors = (p.author ?? []).slice(0, 6)
    .map(a => `${a.family}, ${(a.given ?? '').charAt(0)}.`)
    .join(', ')
  const etAl   = (p.author?.length ?? 0) > 6 ? ', et al.' : ''
  const year   = p.published?.['date-parts']?.[0]?.[0] ?? 'n.d.'
  const title  = p.title?.[0] ?? 'Untitled'
  const jrnl   = p['container-title']?.[0] ?? ''
  const vol    = p.volume ? `, *${p.volume}*` : ''
  const iss    = p.issue  ? `(${p.issue})`   : ''
  const pages  = p.page   ? `, ${p.page}`    : ''
  const doi    = p.DOI    ? ` https://doi.org/${p.DOI}` : ''
  const cited  = p['is-referenced-by-count'] ? ` *(Cited by ${p['is-referenced-by-count']})*` : ''
  return `${authors}${etAl} (${year}). ${title}. ${jrnl}${vol}${iss}${pages}.${doi}${cited}`
}

function buildLitMessage(query: string, filter: LitFilter, items: CrossRefItem[]): string {
  const filterLabel = filter === '5y' ? ' (last 5 years)' : filter === '2y' ? ' (last 2 years)' : ''
  const lines = items.map((p, i) => {
    const apa  = toAPA(p)
    const link = p.DOI ? `[View paper ↗](https://doi.org/${p.DOI})` : ''
    return `**${i + 1}.** ${apa}${link ? `  \n${link}` : ''}`
  })
  return [
    `## Literature Search: "${query}"${filterLabel}`,
    '',
    `Found **${items.length}** verified papers from CrossRef:`,
    '',
    '---',
    '',
    lines.join('\n\n---\n\n'),
    '',
    '---',
    '',
    '> **Note:** These are real papers with verified DOIs. Always read the full text before citing. Use your institution\'s library database to access paywalled articles.',
  ].join('\n')
}

const DOMAINS = [
  'General / Multidisciplinary',
  'Sciences & Mathematics',
  'Engineering & Technology',
  'Health Sciences & Medicine',
  'Social Sciences',
  'Humanities & Arts',
  'Business & Management',
  'Law',
  'Education',
  'Agriculture & Environment',
]

const BASE_SYSTEM = `You are an expert AI Research Assistant for university lecturers and academics in Nigerian and African higher education. You specialise in:
- Conducting literature reviews and summarising academic research
- Explaining research methodologies and their applications
- Suggesting relevant theories, frameworks, and key scholars in any discipline
- Helping structure research papers, proposals, conference papers, and grant applications
- Identifying research gaps and formulating strong research questions
- Explaining statistical methods, data analysis, and research design
- Academic referencing (APA, Harvard, MLA, Chicago, Vancouver)
- Ethical considerations in academic research
- Publishing strategies: journal selection, impact factors, open access

Provide academically rigorous, evidence-based responses. Reference established research where applicable. Always encourage verification from primary sources. Tailor advice to Nigerian/African institutional and funding contexts where relevant.`

const SUGGESTIONS = [
  { icon: BookMarked, label: 'Literature review',    prompt: 'Help me write a literature review outline on the impact of technology on student engagement in Nigerian higher education.' },
  { icon: FileSearch, label: 'Research question',   prompt: 'I am researching e-learning adoption in Nigerian universities post-COVID. Help me formulate 3 strong, researchable questions.' },
  { icon: Microscope, label: 'Methodology advice',  prompt: 'What research methodology would be most appropriate for studying lecturer job satisfaction in Nigerian polytechnics? Compare qualitative, quantitative, and mixed methods.' },
  { icon: Network,    label: 'Theoretical framework', prompt: 'What theoretical frameworks are commonly used in research on academic motivation in African universities? Explain each briefly.' },
]

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function extractFile(file: File): Promise<UploadedPaper> {
  const base  = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
  const token = localStorage.getItem('accessToken') ?? ''
  const fd    = new FormData()
  fd.append('files', file)
  const res = await fetch(`${base}/context/extract`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  })
  if (!res.ok) throw new Error('Failed to extract text from file')
  const data = await res.json() as { sources: Array<{ filename: string; chars: number }>; combined: string }
  const src  = data.sources[0]
  if (!src) throw new Error('No content extracted')
  return { filename: src.filename, chars: src.chars, text: data.combined }
}

function fileIcon(name: string) {
  if (name.endsWith('.pdf'))                          return <FileText className="h-3.5 w-3.5 text-red-500" />
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className="h-3.5 w-3.5 text-blue-500" />
  return <File className="h-3.5 w-3.5 text-muted-foreground" />
}

function loadCitations(): SavedCitation[] {
  try {
    const saved = localStorage.getItem(CITATIONS_KEY)
    return saved ? (JSON.parse(saved) as SavedCitation[]) : []
  } catch { return [] }
}

// ── Citation panel ────────────────────────────────────────────────────────────

function CitationPanel({
  citations, onDelete, onClear, onClose,
}: {
  citations: SavedCitation[]
  onDelete: (id: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  function exportAll() {
    const text = citations
      .map((c, i) => `${i + 1}. ${c.text}`)
      .join('\n\n')
    navigator.clipboard.writeText(text).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadTxt() {
    const text = citations.map((c, i) => `${i + 1}. ${c.text}`).join('\n\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = 'references.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-full flex-col border-l border-border bg-card w-72 shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold">Saved References</span>
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{citations.length}</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {citations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-center px-4 py-8 text-muted-foreground">
          <BookMarked className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No references saved yet</p>
          <p className="text-xs mt-1">Click "Save reference" on any AI message to save a citation here</p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {citations.map((c, i) => (
              <div key={c.id} className="rounded-lg border border-border bg-background p-3 group relative">
                <p className="text-xs text-muted-foreground mb-1">{i + 1}.</p>
                <div className={cn(
                  'prose prose-xs dark:prose-invert max-w-none text-xs',
                  'prose-headings:font-bold prose-headings:text-foreground prose-headings:text-xs',
                  'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-1',
                  'prose-strong:font-semibold prose-li:my-0 prose-ul:my-1 prose-ol:my-1',
                  'prose-hr:border-border prose-hr:my-2',
                  'prose-code:text-[10px] prose-code:bg-muted prose-code:px-1 prose-code:rounded',
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.text}</ReactMarkdown>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-error">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-3 flex flex-col gap-2">
            <button type="button" onClick={exportAll}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-muted transition-colors">
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied!' : 'Copy all references'}
            </button>
            <button type="button" onClick={downloadTxt}
              className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-emerald-200 text-emerald-700 py-1.5 text-xs font-medium hover:bg-emerald-50 transition-colors">
              <Download className="h-3.5 w-3.5" />
              Download as .txt
            </button>
            <button type="button" onClick={onClear}
              className="text-xs text-muted-foreground hover:text-error transition-colors text-center">
              Clear all references
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button type="button" onClick={copy}
      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
      aria-label="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function MessageBubble({ msg, onViewInLibrary, onSaveCitation }: {
  msg: Message
  onViewInLibrary: (id: string) => void
  onSaveCitation: (text: string) => void
}) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold',
        isUser ? 'bg-primary' : 'bg-emerald-700')}>
        {isUser ? 'You' : <FlaskConical className="h-4 w-4" />}
      </div>

      <div className={cn('flex flex-col gap-1', isUser ? 'items-end max-w-[75%]' : 'flex-1 min-w-0')}>
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
            {msg.content}
          </div>
        ) : (
          <div className="w-full">
            {msg.content ? (
              <div className={cn(
                'prose dark:prose-invert max-w-none text-sm',
                'prose-headings:font-bold prose-headings:text-foreground',
                'prose-h1:text-xl prose-h1:mb-3 prose-h1:mt-4',
                'prose-h2:text-base prose-h2:mt-5 prose-h2:mb-2',
                'prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-1',
                'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-2',
                'prose-strong:font-semibold prose-strong:text-foreground',
                'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
                'prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-muted-foreground',
                'prose-hr:border-border prose-hr:my-4',
                'prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
                'prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:text-xs',
                'prose-table:text-xs prose-td:py-1 prose-th:py-1',
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <span className="animate-pulse text-muted-foreground">▌</span>
            )}
          </div>
        )}

        <div className={cn('flex items-center gap-1', isUser && 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground">
            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser && msg.content && <CopyButton text={msg.content} />}
          {!isUser && msg.content && (
            <button type="button"
              onClick={() => onSaveCitation(msg.content)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-emerald-600 opacity-0 transition-opacity hover:bg-emerald-50 dark:hover:bg-emerald-950 group-hover:opacity-100"
              title="Save this response as a reference">
              <BookMarked className="h-3 w-3" />
              Save reference
            </button>
          )}
          {!isUser && msg.documentId && (
            <button type="button"
              onClick={() => onViewInLibrary(msg.documentId!)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100">
              <ExternalLink className="h-3 w-3" />
              View in library
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResearchAssistantPage() {
  const navigate = useNavigate()

  const [messages,     setMessages]     = useState<Message[]>([])
  const [input,        setInput]        = useState('')
  const [isStreaming,  setIsStreaming]   = useState(false)
  const [error,        setError]        = useState('')
  const [domain,       setDomain]       = useState(DOMAINS[0])
  const [domainOpen,   setDomainOpen]   = useState(false)

  // Literature search
  const [litOpen,    setLitOpen]    = useState(false)
  const [litQuery,   setLitQuery]   = useState('')
  const [litFilter,  setLitFilter]  = useState<LitFilter>('all')
  const [litLoading, setLitLoading] = useState(false)

  // Paper upload (RAG)
  const [paper,          setPaper]          = useState<UploadedPaper | null>(null)
  const [uploading,      setUploading]      = useState(false)
  const [uploadError,    setUploadError]    = useState('')
  const [dragging,       setDragging]       = useState(false)
  const [pendingUpload,  setPendingUpload]  = useState<{ filename: string; error?: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Citation management
  const [citations,      setCitations]     = useState<SavedCitation[]>(loadCitations)
  const [showCitations,  setShowCitations] = useState(false)
  const [savedFlash,     setSavedFlash]    = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const asstIdRef  = useRef<string>('')

  // Persist citations
  useEffect(() => {
    localStorage.setItem(CITATIONS_KEY, JSON.stringify(citations))
  }, [citations])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!domainOpen) return
    const handler = () => setDomainOpen(false)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [domainOpen])

  // ── Citation actions ───────────────────────────────────────────────────────
  function saveCitation(text: string) {
    const trimmed = text.trim().slice(0, 2000)
    if (!trimmed) return
    setCitations((prev) => [{ id: crypto.randomUUID(), text: trimmed, savedAt: new Date().toISOString() }, ...prev])
    setSavedFlash(true)
    setShowCitations(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function deleteCitation(id: string) {
    setCitations((prev) => prev.filter((c) => c.id !== id))
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    setUploadError('')
    if (file.size > 20 * 1024 * 1024) { setUploadError('File exceeds 20 MB'); return }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setUploadError('Unsupported type — use PDF, DOCX, or TXT'); return
    }
    setPendingUpload({ filename: file.name })
    setUploading(true)
    try {
      const result = await extractFile(file)
      setPendingUpload(null)
      setPaper(result)
    } catch (e) {
      setPendingUpload({ filename: file.name, error: (e as Error).message })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFileUpload(file)
  }

  // ── System prompt ─────────────────────────────────────────────────────────
  const buildSystemPrompt = useCallback(() => {
    const domainLine = domain !== DOMAINS[0]
      ? `\nYou are currently assisting with research in: **${domain}**. Prioritise knowledge, journals, methods, and scholars relevant to this field.`
      : ''
    const paperSection = paper
      ? `\n\n---\nThe user has uploaded the following reference document. Use it to answer their questions:\n\n[DOCUMENT: ${paper.filename}]\n${paper.text.slice(0, 40000)}\n[END OF DOCUMENT]\n---`
      : ''
    return BASE_SYSTEM + domainLine + paperSection
  }, [domain, paper])

  const buildPrompt = useCallback((history: Message[], userMsg: string) => {
    const lines = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    lines.push(`User: ${userMsg}`, 'Assistant:')
    return lines.join('\n\n')
  }, [])

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    setError('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user',      content: trimmed, timestamp: new Date() }
    const asstMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '',       timestamp: new Date() }
    asstIdRef.current = asstMsg.id

    setMessages((prev) => [...prev, userMsg, asstMsg])
    setIsStreaming(true)
    abortRef.current = new AbortController()

    try {
      const base  = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
      const token = localStorage.getItem('accessToken') ?? ''

      const res = await fetch(`${base}/ai/stream`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt:       buildPrompt(messages, trimmed),
          systemPrompt: buildSystemPrompt(),
          moduleType:   'research-assistant',
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ message: 'Request failed' })) as { message?: string }
        throw new Error(err.message ?? 'Request failed')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      const id      = asstIdRef.current

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; documentId?: string }
            if (parsed.chunk) {
              setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: m.content + parsed.chunk! } : m))
            }
            if (parsed.done && parsed.documentId) {
              setMessages((prev) => prev.map((m) => m.id === id ? { ...m, documentId: parsed.documentId } : m))
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setError((err as Error).message ?? 'Something went wrong')
      setMessages((prev) => prev.filter((m) => m.id !== asstIdRef.current))
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(input) }
  }

  function clearAll() {
    abortRef.current?.abort()
    setMessages([]); setInput(''); setError(''); setIsStreaming(false)
    setPaper(null); setUploadError('')
  }

  async function searchLiterature() {
    const q = litQuery.trim()
    if (!q || litLoading) return
    setLitOpen(false)
    setLitLoading(true)

    const searchingMsg: Message = {
      id: crypto.randomUUID(), role: 'assistant',
      content: `Searching CrossRef for **"${q}"**…`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, searchingMsg])

    try {
      const items = await fetchCrossRef(q, litFilter)
      if (items.length === 0) {
        setMessages((prev) => prev.map((m) =>
          m.id === searchingMsg.id
            ? { ...m, content: `No papers found for **"${q}"**. Try broader keywords.` }
            : m,
        ))
        return
      }
      const resultContent = buildLitMessage(q, litFilter, items)
      setMessages((prev) => prev.map((m) =>
        m.id === searchingMsg.id ? { ...m, content: resultContent } : m,
      ))
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.id === searchingMsg.id
          ? { ...m, content: 'Failed to reach CrossRef. Check your connection and try again.' }
          : m,
      ))
    } finally {
      setLitLoading(false)
      setLitQuery('')
    }
  }

  const domainShort = domain === DOMAINS[0] ? 'All fields' : domain.split('/')[0].trim()

  return (
    <div className="flex h-[calc(100vh-56px)]">

      {/* ── Main chat column ────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
              <FlaskConical className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Research Assistant</p>
              <p className="text-xs text-muted-foreground">AI-powered academic research support</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Domain selector */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button type="button"
                onClick={() => setDomainOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
                <Microscope className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{domainShort}</span>
                <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', domainOpen && 'rotate-180')} />
              </button>
              {domainOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card shadow-lg py-1">
                  {DOMAINS.map((d) => (
                    <button key={d} type="button"
                      onClick={() => { setDomain(d); setDomainOpen(false) }}
                      className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                        d === domain && 'text-primary font-medium bg-primary/5')}>
                      {d}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Upload paper */}
            <button type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50">
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              {uploading ? 'Uploading…' : paper ? 'Change paper' : 'Upload paper'}
            </button>

            {/* References panel toggle */}
            <button type="button"
              onClick={() => setShowCitations((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                showCitations
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
                  : 'border-border bg-card hover:bg-muted',
              )}>
              <BookOpen className="h-3.5 w-3.5" />
              References
              {citations.length > 0 && (
                <span className={cn('text-[10px] px-1 rounded-full font-semibold',
                  savedFlash ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                  {citations.length}
                </span>
              )}
            </button>

            {/* Literature search toggle */}
            <button type="button"
              onClick={() => setLitOpen((v) => !v)}
              disabled={litLoading}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                litOpen
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border bg-card hover:bg-muted',
              )}>
              {litLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              Search literature
            </button>

            {messages.length > 0 && (
              <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={clearAll}>New chat</Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" className="hidden"
            accept=".pdf,.docx,.doc,.txt,.md"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f) }} />
        </div>

        {/* Literature search bar */}
        {litOpen && (
          <div className="shrink-0 border-b border-border bg-muted/30 px-6 py-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                autoFocus
                type="text"
                value={litQuery}
                onChange={(e) => setLitQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void searchLiterature(); if (e.key === 'Escape') setLitOpen(false) }}
                placeholder="Search for papers, e.g. blended learning Nigeria higher education"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              {/* Year filter */}
              <div className="flex items-center gap-1 border-l border-border pl-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {(['all', '5y', '2y'] as LitFilter[]).map((f) => (
                  <button key={f} type="button"
                    onClick={() => setLitFilter(f)}
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                      litFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}>
                    {f === 'all' ? 'All' : f === '5y' ? 'Last 5yr' : 'Last 2yr'}
                  </button>
                ))}
              </div>
              <button type="button"
                onClick={() => void searchLiterature()}
                disabled={!litQuery.trim() || litLoading}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors">
                Search
              </button>
              <button type="button" onClick={() => setLitOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="shrink-0 flex items-center gap-2 border-b border-border bg-error/5 px-6 py-2 text-xs text-error">
            {uploadError}
            <button type="button" onClick={() => setUploadError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Paper chip — shows filename immediately on selection, then full info after extraction */}
        {(paper || pendingUpload) && (
          <div className={cn(
            'shrink-0 flex items-center gap-2 border-b border-border px-6 py-2',
            pendingUpload?.error
              ? 'bg-destructive/5'
              : paper
                ? 'bg-emerald-50 dark:bg-emerald-950/30'
                : 'bg-muted/40',
          )}>
            {pendingUpload && !paper ? (
              <>
                {pendingUpload.error
                  ? <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                <span className={cn('text-xs font-medium truncate max-w-xs', pendingUpload.error ? 'text-destructive' : 'text-foreground')}>
                  {pendingUpload.filename}
                </span>
                {pendingUpload.error
                  ? <span className="text-[10px] text-destructive">{pendingUpload.error}</span>
                  : <span className="text-[10px] text-muted-foreground">Extracting text…</span>}
                {pendingUpload.error && (
                  <button type="button" onClick={() => setPendingUpload(null)} className="ml-auto text-muted-foreground hover:text-error transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            ) : paper ? (
              <>
                {fileIcon(paper.filename)}
                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate max-w-xs">{paper.filename}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{paper.chars.toLocaleString()} characters · Context active</span>
                <button type="button" onClick={() => { setPaper(null); setUploadError(''); setPendingUpload(null) }}
                  className="ml-auto text-emerald-600 hover:text-error transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-8">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700">
                  <FlaskConical className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-lg font-semibold">Research Assistant</h2>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                  Get help with literature reviews, research design, theoretical frameworks, grant proposals, and academic writing.
                </p>
                {!paper && (
                  <button type="button"
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'mt-4 mx-auto flex items-center gap-2 rounded-xl border-2 border-dashed px-5 py-3 text-sm transition-colors cursor-pointer',
                      dragging
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-foreground',
                    )}>
                    <Upload className="h-4 w-4" />
                    Drop a paper or document to discuss it
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-lg w-full">
                {SUGGESTIONS.map((s) => (
                  <button key={s.label} type="button" onClick={() => void sendMessage(s.prompt)}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm hover:bg-muted/60 transition-colors">
                    <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-medium">{s.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{s.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5 pb-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg}
                  onViewInLibrary={(id) => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id }))}
                  onSaveCitation={saveCitation} />
              ))}
              {error && (
                <div className="rounded-lg border border-error/20 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={paper
                  ? `Ask about "${paper.filename.replace(/\.[^.]+$/, '')}"…  (Enter to send)`
                  : 'Ask about literature, research methods, frameworks, citations…  (Enter to send)'}
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground max-h-40"
                onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px` }}
                disabled={isStreaming}
              />
              {isStreaming
                ? <Button type="button" variant="outline" size="sm" leftIcon={<Square className="h-4 w-4" />}
                    onClick={() => { abortRef.current?.abort(); setIsStreaming(false) }}
                    className="shrink-0">Stop</Button>
                : <Button type="button" variant="primary" size="sm" leftIcon={<Send className="h-4 w-4" />}
                    onClick={() => void sendMessage(input)}
                    disabled={!input.trim()}
                    className="shrink-0">Send</Button>
              }
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-0.5" />
              AI responses are based on general knowledge. Always verify from primary academic sources.
            </p>
          </div>
        </div>
      </div>

      {/* ── Citation panel ───────────────────────────────────────────────── */}
      {showCitations && (
        <CitationPanel
          citations={citations}
          onDelete={deleteCitation}
          onClear={() => setCitations([])}
          onClose={() => setShowCitations(false)}
        />
      )}
    </div>
  )
}
