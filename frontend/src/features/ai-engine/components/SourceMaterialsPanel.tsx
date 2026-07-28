import { useState, useRef } from 'react'
import {
  Upload, X, FileText, File, AlertCircle,
  ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadedSource {
  id:       string
  filename: string
  chars:    number
  text:     string
}

type PendingState = 'processing' | 'done' | 'error'

interface PendingFile {
  id:       string
  filename: string
  state:    PendingState
  chars?:   number
  error?:   string
}

function fileIcon(name: string, sizeClass = 'h-3.5 w-3.5') {
  if (name.endsWith('.pdf'))                           return <FileText className={cn(sizeClass, 'text-red-500')} />
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className={cn(sizeClass, 'text-blue-500')} />
  return <File className={cn(sizeClass, 'text-muted-foreground')} />
}

function isPlainText(file: File): boolean {
  return (
    file.type === 'text/plain' ||
    file.type === 'text/markdown' ||
    file.name.endsWith('.txt') ||
    file.name.endsWith('.md')
  )
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsText(file, 'utf-8')
  })
}

async function extractViaServer(files: File[]): Promise<UploadedSource[]> {
  const base  = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
  const token = localStorage.getItem('accessToken') ?? ''
  const fd    = new FormData()
  files.forEach((f) => fd.append('files', f))

  const res = await fetch(`${base}/context/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  })

  if (!res.ok) {
    let serverMsg = `Server error ${res.status}`
    try {
      const body = await res.json() as { message?: string; error?: string }
      serverMsg = body.message ?? body.error ?? serverMsg
    } catch { /* ignore */ }
    throw new Error(serverMsg)
  }

  const data = await res.json() as {
    sources:  Array<{ filename: string; chars: number }>
    combined: string
    errors:   Array<{ filename: string; error: string }>
  }

  const combined = data.combined
  return data.sources.map((s) => {
    const marker = `--- SOURCE: ${s.filename} ---\n`
    const start  = combined.indexOf(marker)
    const end    = start === -1 ? -1 : combined.indexOf('\n--- SOURCE:', start + marker.length)
    const text   = start === -1
      ? ''
      : (end === -1 ? combined.slice(start + marker.length) : combined.slice(start + marker.length, end))
    return { id: crypto.randomUUID(), filename: s.filename, chars: s.chars, text: text.trim() }
  })
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

interface Props {
  sources:      UploadedSource[]
  onAdd:        (sources: UploadedSource[]) => void
  onRemove:     (id: string) => void
  disabled:     boolean
  description?: string
}

export function SourceMaterialsPanel({ sources, onAdd, onRemove, disabled, description }: Props) {
  const [open,     setOpen]     = useState(false)
  const [pending,  setPending]  = useState<PendingFile[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const anyProcessing = pending.some((p) => p.state === 'processing')
  const hasErrors     = pending.some((p) => p.state === 'error')

  // IDs of files that are already confirmed in sources — hide the 'done' pending entry for them
  const sourceFilenames = new Set(sources.map((s) => s.filename))
  const visiblePending  = pending.filter(
    (p) => !(p.state === 'done' && sourceFilenames.has(p.filename)),
  )

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || disabled) return

    // Pair each file with a stable ID so we can update its pending entry later
    interface Task { id: string; file: File }
    const tasks:    Task[]        = []
    const rejected: PendingFile[] = []

    for (const f of Array.from(fileList)) {
      const id = crypto.randomUUID()
      if (f.size > 20 * 1024 * 1024) {
        rejected.push({ id, filename: f.name, state: 'error', error: 'Exceeds 20 MB limit' })
        continue
      }
      if (!ALLOWED_TYPES.includes(f.type) && !f.name.endsWith('.txt') && !f.name.endsWith('.md')) {
        rejected.push({ id, filename: f.name, state: 'error', error: 'Unsupported type — use PDF, DOCX, or TXT' })
        continue
      }
      tasks.push({ id, file: f })
    }

    // Show all filenames immediately as 'processing'
    const newPending: PendingFile[] = tasks.map(({ id, file }) => ({
      id, filename: file.name, state: 'processing',
    }))
    setPending((prev) => [...prev, ...newPending, ...rejected])
    setOpen(true)
    if (inputRef.current) inputRef.current.value = ''

    if (tasks.length === 0) return

    const textTasks   = tasks.filter((t) => isPlainText(t.file))
    const binaryTasks = tasks.filter((t) => !isPlainText(t.file))
    const results: UploadedSource[] = []

    // Client-side: plain text / markdown
    for (const { id, file } of textTasks) {
      try {
        const text = (await readTextFile(file)).slice(0, 40_000)
        const src: UploadedSource = { id: crypto.randomUUID(), filename: file.name, chars: text.length, text }
        results.push(src)
        // Mark 'done' so the name stays visible while onAdd/sources prop propagates
        setPending((prev) =>
          prev.map((p) => p.id === id ? { ...p, state: 'done', chars: text.length } : p)
        )
      } catch (e) {
        setPending((prev) =>
          prev.map((p) => p.id === id ? { ...p, state: 'error', error: (e as Error).message } : p)
        )
      }
    }

    // Server-side: PDF / DOCX
    if (binaryTasks.length > 0) {
      const binaryIds = binaryTasks.map((t) => t.id)
      try {
        const serverResults = await extractViaServer(binaryTasks.map((t) => t.file))
        results.push(...serverResults)
        // Mark all binary tasks done
        setPending((prev) =>
          prev.map((p) =>
            binaryIds.includes(p.id)
              ? { ...p, state: 'done', chars: serverResults.find((r) => r.filename === p.filename)?.chars }
              : p
          )
        )
      } catch (e) {
        const errMsg = (e as Error).message
        setPending((prev) =>
          prev.map((p) => binaryIds.includes(p.id) ? { ...p, state: 'error', error: errMsg } : p)
        )
      }
    }

    if (results.length > 0) {
      onAdd(results)
    }
  }

  const totalChars = sources.reduce((a, s) => a + s.chars, 0)

  return (
    <div className="rounded-xl border border-border bg-muted/20">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <span>Source Materials</span>
          {sources.length > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {sources.length}
            </span>
          )}
          {anyProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          {hasErrors && !anyProcessing && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {/* ── Collapsed name pills ─────────────────────────────────────── */}
      {!open && (sources.length > 0 || visiblePending.length > 0) && (
        <div className="border-t border-border px-4 pb-3 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] text-foreground">
                {fileIcon(s.filename, 'h-3 w-3')}
                <span className="max-w-35 truncate">{s.filename}</span>
              </span>
            ))}
            {visiblePending.map((p) => (
              <span
                key={p.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px]',
                  p.state === 'error' ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-border bg-card text-muted-foreground',
                )}
              >
                {p.state === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                {p.state === 'error'      && <XCircle  className="h-3 w-3 shrink-0" />}
                {p.state === 'done'       && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                <span className="max-w-30 truncate">{p.filename}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Expanded panel ───────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description ?? 'Upload course materials (PDF, DOCX, TXT). The AI will ground its output in these sources and reference them.'}
          </p>

          {/* Drop zone */}
          <div
            onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) void handleFiles(e.dataTransfer.files) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !disabled && inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drop files here or click to browse</p>
            <p className="text-[10px] text-muted-foreground/60">PDF, DOCX, TXT, MD · Max 20 MB each · Multiple files supported</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={disabled}
          />

          {/* Pending list — files shown immediately on selection */}
          {visiblePending.length > 0 && (
            <ul className="space-y-1.5">
              {visiblePending.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2',
                    p.state === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-card',
                  )}
                >
                  {fileIcon(p.filename)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{p.filename}</p>
                    {p.state === 'processing' && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" /> Extracting text…
                      </p>
                    )}
                    {p.state === 'done' && p.chars !== undefined && (
                      <p className="text-[10px] text-green-600 dark:text-green-400">{p.chars.toLocaleString()} chars ready</p>
                    )}
                    {p.state === 'error' && (
                      <p className="text-[10px] text-destructive">{p.error}</p>
                    )}
                  </div>
                  {(p.state === 'done' || p.state === 'error') && (
                    <button
                      type="button"
                      onClick={() => {
                        setPending((prev) => prev.filter((x) => x.id !== p.id))
                        if (p.state === 'done') {
                          const src = sources.find((s) => s.filename === p.filename)
                          if (src) onRemove(src.id)
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Confirmed sources (from props) — shown only if not already in visiblePending as 'done' */}
          {sources.length > 0 && (
            <ul className="space-y-1.5">
              {sources.filter((s) => !visiblePending.some((p) => p.filename === s.filename && p.state === 'done')).map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {fileIcon(s.filename)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{s.filename}</p>
                    <p className="text-[10px] text-muted-foreground">{s.chars.toLocaleString()} chars extracted</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    aria-label="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {sources.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Total context: {totalChars.toLocaleString()} characters
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function buildSourceContext(sources: UploadedSource[]): string | undefined {
  if (sources.length === 0) return undefined
  return sources.map((s) => `--- SOURCE: ${s.filename} ---\n${s.text}`).join('\n\n')
}
