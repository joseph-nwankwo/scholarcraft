import { useState, useRef, useEffect, useCallback } from 'react'
import {
  GraduationCap, Send, Square, RotateCcw, Copy, Check,
  Sparkles, BookOpen, ClipboardList, HelpCircle, Lightbulb,
  Library, Upload, X, XCircle, Loader2, FileText, File, Mic, MicOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type SpeechRecInstance = {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
type SpeechRecConstructor = new () => SpeechRecInstance

interface Message {
  id:         string
  role:       'user' | 'assistant'
  content:    string
  timestamp:  string   // ISO string — survives JSON serialisation
  documentId?: string
}

interface UploadedMaterial {
  id:       string
  filename: string
  chars:    number
  text:     string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'ta-messages'
const MATERIALS_KEY = 'ta-materials'
const MAX_MATERIALS = 5
const MAX_FILE_MB   = 20

const BASE_SYSTEM = `You are an expert AI Teaching Assistant for university and polytechnic lecturers in Nigeria and Africa. You help educators with:
- Explaining academic concepts clearly at the right level (ND, HND, BSc, MSc, PhD)
- Suggesting teaching strategies and pedagogical approaches
- Helping prepare lesson content, examples, and analogies
- Providing feedback on teaching materials
- Answering questions about curriculum design and assessment
- Recommending resources and references for any topic

Be concise, practical, and academically rigorous. Tailor your responses to higher education contexts.`

const SUGGESTIONS = [
  { icon: BookOpen,      label: 'Explain a concept',  prompt: 'Explain the concept of recursion in a way suitable for first-year Computer Science students.' },
  { icon: ClipboardList, label: 'Lesson plan help',   prompt: 'Help me plan a 90-minute lecture on database normalisation for HND level students.' },
  { icon: HelpCircle,    label: "Student's question", prompt: 'A student asked: "Why is Big O notation important?" How should I best answer this?' },
  { icon: Lightbulb,     label: 'Teaching strategy',  prompt: 'What are effective active learning strategies for a large class of 200+ students?' },
]

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(name: string) {
  if (name.endsWith('.pdf'))                          return <FileText className="h-3.5 w-3.5 text-red-500" />
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className="h-3.5 w-3.5 text-blue-500" />
  return <File className="h-3.5 w-3.5 text-muted-foreground" />
}

async function extractFile(file: File): Promise<{ filename: string; chars: number; text: string }> {
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

function loadMessages(): Message[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Message[]) : []
  } catch { return [] }
}

function loadMaterials(): UploadedMaterial[] {
  try {
    const saved = localStorage.getItem(MATERIALS_KEY)
    return saved ? (JSON.parse(saved) as UploadedMaterial[]) : []
  } catch { return [] }
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

function MessageBubble({ msg, onViewInLibrary }: { msg: Message; onViewInLibrary: (id: string) => void }) {
  const isUser = msg.role === 'user'
  const time   = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className={cn('group flex gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-xs font-bold',
        isUser ? 'bg-primary' : 'bg-slate-700')}>
        {isUser ? 'You' : <GraduationCap className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser && 'items-end')}>
        <div className={cn('rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm')}>
          {msg.content || <span className="animate-pulse text-muted-foreground">▌</span>}
        </div>
        <div className={cn('flex items-center gap-1', isUser && 'flex-row-reverse')}>
          <span className="text-[10px] text-muted-foreground">{time}</span>
          {!isUser && msg.content && <CopyButton text={msg.content} />}
          {!isUser && msg.documentId && (
            <button type="button" onClick={() => onViewInLibrary(msg.documentId!)}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100">
              <Library className="h-3 w-3" />
              View in library
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeachingAssistantPage() {
  const navigate = useNavigate()

  // ── State ─────────────────────────────────────────────────────────────────
  const [messages,    setMessages]    = useState<Message[]>(loadMessages)
  const [input,       setInput]       = useState('')
  const [isStreaming, setIsStreaming]  = useState(false)
  const [error,       setError]       = useState('')

  // Course materials (RAG)
  const [materials,    setMaterials]    = useState<UploadedMaterial[]>(loadMaterials)
  const [uploading,    setUploading]    = useState(false)
  const [uploadError,  setUploadError]  = useState('')
  const [pendingUpload, setPendingUpload] = useState<{ filename: string; error?: string } | null>(null)

  // Voice input
  const [listening,   setListening]   = useState(false)
  const [voiceError,  setVoiceError]  = useState('')

  const bottomRef     = useRef<HTMLDivElement>(null)
  const abortRef      = useRef<AbortController | null>(null)
  const asstIdRef     = useRef<string>('')
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecInstance | null>(null)

  // ── Persistence ──────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    localStorage.setItem(MATERIALS_KEY, JSON.stringify(materials))
  }, [materials])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── System prompt (injects uploaded materials) ────────────────────────────
  const buildSystemPrompt = useCallback(() => {
    if (materials.length === 0) return BASE_SYSTEM
    const combined = materials
      .map((m) => `[MATERIAL: ${m.filename}]\n${m.text.slice(0, Math.floor(40000 / materials.length))}\n[END]`)
      .join('\n\n')
    return `${BASE_SYSTEM}\n\n---\nThe lecturer has uploaded the following course materials. Use them to inform your answers:\n\n${combined}\n---`
  }, [materials])

  // ── Conversation prompt ───────────────────────────────────────────────────
  const buildPrompt = useCallback((history: Message[], userMsg: string) => {
    const lines = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    lines.push(`User: ${userMsg}`, 'Assistant:')
    return lines.join('\n\n')
  }, [])

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    setUploadError('')
    if (materials.length >= MAX_MATERIALS) {
      setUploadError(`Maximum ${MAX_MATERIALS} materials. Remove one first.`)
      return
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`File exceeds ${MAX_FILE_MB} MB`)
      return
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setUploadError('Unsupported type — use PDF, DOCX, or TXT')
      return
    }
    setPendingUpload({ filename: file.name })
    setUploading(true)
    try {
      const result = await extractFile(file)
      setPendingUpload(null)
      setMaterials((prev) => [
        ...prev,
        { id: crypto.randomUUID(), filename: result.filename, chars: result.chars, text: result.text },
      ])
    } catch (e) {
      setPendingUpload({ filename: file.name, error: (e as Error).message })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeMaterial(id: string) {
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  // ── Voice input ───────────────────────────────────────────────────────────
  function toggleVoice() {
    setVoiceError('')
    const w = window as unknown as { SpeechRecognition?: SpeechRecConstructor; webkitSpeechRecognition?: SpeechRecConstructor }
    const SpeechRec = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SpeechRec) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const rec = new SpeechRec()
    rec.continuous    = false
    rec.interimResults = true
    rec.lang          = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('')
      setInput(transcript)
    }
    rec.onend  = () => setListening(false)
    rec.onerror = () => { setListening(false); setVoiceError('Voice recognition error. Try again.') }

    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return
    setInput('')
    setError('')
    if (listening) { recognitionRef.current?.stop(); setListening(false) }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user',      content: trimmed, timestamp: new Date().toISOString() }
    const asstMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '',      timestamp: new Date().toISOString() }
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
          prompt:       buildPrompt(messages.concat(userMsg).slice(0, -1), trimmed),
          systemPrompt: buildSystemPrompt(),
          moduleType:   'teaching-assistant',
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

  function clearAll() {
    abortRef.current?.abort()
    recognitionRef.current?.stop()
    setMessages([])
    setInput('')
    setError('')
    setIsStreaming(false)
    setListening(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(input) }
  }

  const materialsLabel = materials.length === 0
    ? 'Add materials'
    : `${materials.length} material${materials.length > 1 ? 's' : ''} loaded`

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Teaching Assistant</p>
            <p className="text-xs text-muted-foreground">AI-powered pedagogical support</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload materials button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || materials.length >= MAX_MATERIALS}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
              materials.length > 0
                ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}>
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : materialsLabel}
          </button>

          {messages.length > 0 && (
            <Button variant="ghost" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={clearAll}>New chat</Button>
          )}
        </div>

        <input ref={fileInputRef} type="file" className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f) }} />
      </div>

      {/* ── Upload error ───────────────────────────────────────────────── */}
      {uploadError && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border bg-error/5 px-6 py-2 text-xs text-error">
          {uploadError}
          <button type="button" onClick={() => setUploadError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── Material chips ─────────────────────────────────────────────── */}
      {(materials.length > 0 || pendingUpload) && (
        <div className="shrink-0 flex items-center gap-2 border-b border-border bg-primary/5 px-6 py-2 flex-wrap">
          <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Course materials:</span>
          {materials.map((m) => (
            <div key={m.id} className="flex items-center gap-1 rounded-full border border-primary/20 bg-card px-2 py-0.5">
              {fileIcon(m.filename)}
              <span className="text-xs font-medium text-foreground max-w-35 truncate">{m.filename}</span>
              <span className="text-[10px] text-muted-foreground">{(m.chars / 1000).toFixed(0)}k chars</span>
              <button type="button" onClick={() => removeMaterial(m.id)}
                className="text-muted-foreground hover:text-error ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {pendingUpload && (
            <div className={cn(
              'flex items-center gap-1 rounded-full border px-2 py-0.5',
              pendingUpload.error ? 'border-destructive/30 bg-destructive/5' : 'border-primary/20 bg-card',
            )}>
              {pendingUpload.error
                ? <XCircle className="h-3 w-3 text-destructive shrink-0" />
                : <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
              <span className={cn('text-xs font-medium max-w-35 truncate', pendingUpload.error ? 'text-destructive' : 'text-foreground')}>
                {pendingUpload.filename}
              </span>
              {pendingUpload.error && (
                <button type="button" onClick={() => setPendingUpload(null)} className="text-muted-foreground hover:text-error ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          {materials.length < MAX_MATERIALS && !pendingUpload && (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40">
              <Upload className="h-3 w-3" />
              Add more
            </button>
          )}
        </div>
      )}

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-lg font-semibold">Teaching Assistant</h2>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Ask anything about teaching, lesson planning, student questions, or pedagogy.
                Upload course materials to get answers grounded in your content.
              </p>
              {materials.length === 0 && (
                <button type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 flex items-center gap-2 rounded-xl border-2 border-dashed border-border px-5 py-3 text-sm text-muted-foreground mx-auto hover:border-primary/40 hover:text-foreground transition-colors">
                  <Upload className="h-4 w-4" />
                  Upload course materials (optional)
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 max-w-lg w-full">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} type="button" onClick={() => void sendMessage(s.prompt)}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-left text-sm hover:bg-muted/60 transition-colors">
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
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
                onViewInLibrary={(id) => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id }))} />
            ))}
            {error && (
              <div className="rounded-lg border border-error/20 bg-error/5 px-4 py-2.5 text-sm text-error">{error}</div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Voice error ─────────────────────────────────────────────────── */}
      {voiceError && (
        <div className="shrink-0 flex items-center gap-2 border-t border-border bg-warning/5 px-6 py-2 text-xs text-warning-foreground">
          {voiceError}
          <button type="button" onClick={() => setVoiceError('')} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
            {/* Voice input button */}
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? 'Stop recording' : 'Voice input'}
              className={cn(
                'mb-0.5 shrink-0 rounded-lg p-1.5 transition-colors',
                listening
                  ? 'bg-error/10 text-error hover:bg-error/20 animate-pulse'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}>
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={listening ? 'Listening…' : 'Ask about teaching strategies, lesson planning, student questions…  (Enter to send, Shift+Enter for newline)'}
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
            AI responses are generated. Always verify important academic information.
            {messages.length > 0 && <span className="ml-2 opacity-60">· Conversation saved locally</span>}
          </p>
        </div>
      </div>
    </div>
  )
}
