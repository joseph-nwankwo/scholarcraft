import { useState, useRef, useEffect, Fragment } from 'react'
import {
  Users, Upload, FileText, File, AlertCircle, X,
  Loader2, Sparkles, Square, RotateCcw, Download,
  ChevronDown, ChevronUp, Plus, BarChart2, ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { cn } from '@/lib/utils'

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string

// ── Types ─────────────────────────────────────────────────────────────────────

type SchemeMode = 'library' | 'upload' | 'paste'
type Grade     = 'A' | 'B' | 'C' | 'D' | 'F'
type Phase     = 'idle' | 'grading' | 'done'

interface LibraryScheme { id: string; title: string }

interface SchemeFile { file: File; text?: string; loading: boolean; error?: string }

interface GradeResult {
  studentLabel:   string
  score:          number
  totalMarks:     number
  percentage:     number
  grade:          Grade
  classification: string
  summary:        string
  feedback:       string
  fullReport:     string
  expanded:       boolean
  error?:         string
}

interface GradingProgress { current: number; total: number; currentLabel: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const LEVELS = ['ND', 'HND', 'BSc', 'MSc', 'MBA', 'PhD', 'Professional'] as const

const GRADE_CONFIG: Record<Grade, { color: string; bg: string }> = {
  A: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  B: { color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-100 dark:bg-blue-900/30' },
  C: { color: 'text-yellow-700 dark:text-yellow-400',   bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  D: { color: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-100 dark:bg-orange-900/30' },
  F: { color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-100 dark:bg-red-900/30' },
}

const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

const IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

// ── Helpers ───────────────────────────────────────────────────────────────────

function gradeFromPct(pct: number): Grade {
  if (pct >= 70) return 'A'
  if (pct >= 60) return 'B'
  if (pct >= 50) return 'C'
  if (pct >= 45) return 'D'
  return 'F'
}

function classificationFromGrade(g: Grade): string {
  return { A: 'Distinction', B: 'Credit', C: 'Pass', D: 'Marginal Pass', F: 'Fail' }[g]
}

function isImageFile(f: File): boolean {
  return IMAGE_MIME.includes(f.type) ||
    /\.(jpe?g|png|webp)$/i.test(f.name)
}

async function extractText(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('files', file)
  const res = await fetch(`${API_BASE}/context/extract`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
    body: fd,
  })
  if (!res.ok) throw new Error('Text extraction failed')
  const data = await res.json() as { combined: string; sources: { filename: string }[] }
  if (!data.sources.length) throw new Error('No content extracted from file')
  return data.combined
}

async function transcribeImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await fetch(`${API_BASE}/marking/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
    body: fd,
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({ message: 'Transcription failed' })) as { message?: string }
    throw new Error(e.message ?? 'Image transcription failed')
  }
  const data = await res.json() as { text: string }
  if (!data.text?.trim()) throw new Error('No text could be read from image')
  return data.text
}

async function extractFileText(file: File): Promise<string> {
  if (isImageFile(file)) return transcribeImage(file)
  return extractText(file)
}

function exportCsv(results: GradeResult[], title: string) {
  const rows = [
    ['Student', 'Score', 'Total Marks', 'Percentage', 'Grade', 'Classification', 'Summary'],
    ...results.map((r) =>
      r.error
        ? [r.studentLabel, 'ERROR', String(r.totalMarks), '-', '-', r.error, '']
        : [
            r.studentLabel,
            String(r.score),
            String(r.totalMarks),
            `${r.percentage.toFixed(1)}%`,
            r.grade,
            r.classification,
            `"${r.summary.replace(/"/g, '""')}"`,
          ]
    ),
  ]
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(title || 'grade-book').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

function isAllowedFile(f: File): boolean {
  return ALLOWED_MIME.includes(f.type) ||
    IMAGE_MIME.includes(f.type) ||
    /\.(txt|md|jpe?g|png|webp)$/i.test(f.name)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FileIcon({ name }: { name: string }) {
  const cls = 'h-3.5 w-3.5 shrink-0'
  if (/\.(jpe?g|png|webp)$/i.test(name)) return <ImageIcon className={cn(cls, 'text-purple-500')} />
  if (name.endsWith('.pdf'))              return <FileText className={cn(cls, 'text-red-500')} />
  if (/\.docx?$/.test(name))             return <FileText className={cn(cls, 'text-blue-500')} />
  return <File className={cn(cls, 'text-muted-foreground')} />
}

function GradePill({ grade }: { grade: Grade }) {
  const cfg = GRADE_CONFIG[grade]
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-xs font-bold', cfg.color, cfg.bg)}>
      {grade}
    </span>
  )
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a professional academic examiner with expertise in Nigerian and African higher education standards.
Grade student submissions fairly and consistently against the provided marking scheme.
Award marks only for what is explicitly present in the submission — never fabricate content.
End every response with the required GRADE_RESULT JSON block, no exceptions.`

function buildPrompt(submission: string, scheme: string, label: string, title: string, marks: number, level: string): string {
  return `## GRADING TASK

**Assessment:** ${title || 'Assessment'}
**Student:** ${label}
**Total Marks:** ${marks}
**Academic Level:** ${level}

---

## MARKING SCHEME

${scheme || 'No marking scheme provided — apply general academic standards appropriate to the level.'}

---

## STUDENT SUBMISSION

${submission || '[No submission text could be extracted]'}

---

## INSTRUCTIONS

1. Assess the submission against each criterion in the marking scheme.
2. Award marks based solely on what the student has written.
3. Write a concise assessment (3–5 sentences covering strengths and gaps).
4. End your response with EXACTLY this block on its own line — raw JSON, no backticks:

<GRADE_RESULT>{"score":<number>,"totalMarks":${marks},"grade":"<A|B|C|D|F>","classification":"<Distinction|Credit|Pass|Marginal Pass|Fail>","summary":"<one sentence overall assessment>","feedback":"<2–3 sentences of constructive feedback>"}</GRADE_RESULT>

Nigerian Grading Scale: A=70%+, B=60–69%, C=50–59%, D=45–49%, F=below 45%`
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MarkingAssistantPage() {
  // Scheme inputs
  const [schemeMode,      setSchemeMode]      = useState<SchemeMode>('library')
  const [librarySchemes,  setLibrarySchemes]  = useState<LibraryScheme[]>([])
  const [libraryLoading,  setLibraryLoading]  = useState(false)
  const [selectedSchemeId, setSelectedSchemeId] = useState('')
  const [schemeContent,   setSchemeContent]   = useState<string | null>(null)
  const [schemeLoading,   setSchemeLoading]   = useState(false)
  const [schemeFile,      setSchemeFile]      = useState<SchemeFile | null>(null)
  const [schemePaste,     setSchemePaste]     = useState('')
  const [schemeDragging,  setSchemeDragging]  = useState(false)
  const schemeInputRef = useRef<HTMLInputElement>(null)

  // Student scripts
  const [studentFiles,    setStudentFiles]    = useState<File[]>([])
  const [studentDragging, setStudentDragging] = useState(false)
  const studentInputRef = useRef<HTMLInputElement>(null)

  // Assessment details
  const [assessmentTitle, setAssessmentTitle] = useState('')
  const [totalMarks,      setTotalMarks]      = useState('100')
  const [academicLevel,   setAcademicLevel]   = useState('BSc')

  // Grading state
  const [phase,    setPhase]    = useState<Phase>('idle')
  const [progress, setProgress] = useState<GradingProgress | null>(null)
  const [results,  setResults]  = useState<GradeResult[]>([])
  const [error,    setError]    = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Load marking scheme list from library on mount
  useEffect(() => {
    async function fetchSchemes() {
      setLibraryLoading(true)
      try {
        const res = await fetch(`${API_BASE}/generate/documents?type=MARKING_SCHEME&limit=50`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        })
        if (!res.ok) return
        const data = await res.json() as { data: Array<{ id: string; title: string }> }
        setLibrarySchemes(data.data ?? [])
      } catch {
        // silently — library just won't populate
      } finally {
        setLibraryLoading(false)
      }
    }
    void fetchSchemes()
  }, [])

  // Fetch full scheme content when library selection changes
  async function handleLibrarySelect(id: string) {
    setSelectedSchemeId(id)
    setSchemeContent(null)
    if (!id) return
    setSchemeLoading(true)
    try {
      const res = await fetch(`${API_BASE}/generate/documents/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      })
      if (!res.ok) throw new Error('Failed to load scheme')
      const data = await res.json() as {
        data: {
          id: string; title: string
          currentVersion?: { markdownContent?: string | null } | null
          content?: string | null
        }
      }
      setSchemeContent(data.data.currentVersion?.markdownContent ?? data.data.content ?? '')
    } catch {
      setSchemeContent('')
    } finally {
      setSchemeLoading(false)
    }
  }

  // Handle scheme file upload
  async function handleSchemeFile(file: File) {
    if (file.size > 20 * 1024 * 1024) { setError('Scheme file exceeds 20 MB'); return }
    setSchemeFile({ file, loading: true })
    try {
      const text = await extractText(file)
      setSchemeFile({ file, text, loading: false })
    } catch (e) {
      setSchemeFile({ file, loading: false, error: (e as Error).message })
    }
  }

  // Get scheme text for grading
  function getSchemeText(): string {
    if (schemeMode === 'library') return schemeContent ?? ''
    if (schemeMode === 'upload')  return schemeFile?.text ?? ''
    return schemePaste
  }

  // Add student files (dedup by name+size)
  function addStudentFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter(isAllowedFile)
    setStudentFiles((prev) => {
      const existing = new Set(prev.map((f) => `${f.name}:${f.size}`))
      return [...prev, ...incoming.filter((f) => !existing.has(`${f.name}:${f.size}`))]
    })
  }

  // Grade one student (returns structured result)
  async function gradeOne(submission: string, scheme: string, label: string, signal: AbortSignal): Promise<GradeResult> {
    const marks = Math.max(1, Number(totalMarks) || 100)
    const prompt = buildPrompt(submission, scheme, label, assessmentTitle, marks, academicLevel)

    const res = await fetch(`${API_BASE}/ai/stream`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      body:    JSON.stringify({ prompt, systemPrompt: SYSTEM_PROMPT, moduleType: 'marking-assistant' }),
      signal,
    })

    if (!res.ok || !res.body) {
      const e = await res.json().catch(() => ({ message: 'Grading failed' })) as { message?: string }
      throw new Error(e.message ?? 'Grading failed')
    }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let fullText  = ''

    done: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean }
          if (parsed.chunk) fullText += parsed.chunk
          if (parsed.done)  break done
        } catch { /* skip malformed */ }
      }
    }

    const match = /<GRADE_RESULT>([\s\S]*?)<\/GRADE_RESULT>/.exec(fullText)
    if (!match?.[1]) throw new Error('AI did not return a valid grade block')

    const g = JSON.parse(match[1]) as {
      score: number; totalMarks: number
      grade: string; classification: string
      summary: string; feedback: string
    }
    const score      = Math.min(Math.max(0, g.score), marks)
    const percentage = (score / marks) * 100
    const grade      = gradeFromPct(percentage)
    const fullReport = fullText.replace(/<GRADE_RESULT>[\s\S]*?<\/GRADE_RESULT>/, '').trim()

    return {
      studentLabel:   label,
      score,
      totalMarks:     marks,
      percentage,
      grade,
      classification: g.classification || classificationFromGrade(grade),
      summary:        g.summary || '',
      feedback:       g.feedback || '',
      fullReport,
      expanded:       false,
    }
  }

  // Grade all students sequentially
  async function handleGradeAll() {
    if (studentFiles.length === 0) return
    setPhase('grading')
    setResults([])
    setError('')

    abortRef.current = new AbortController()
    const { signal } = abortRef.current
    const scheme     = getSchemeText()
    const accumulated: GradeResult[] = []

    for (let i = 0; i < studentFiles.length; i++) {
      if (signal.aborted) break
      const file = studentFiles[i]
      setProgress({ current: i + 1, total: studentFiles.length, currentLabel: file.name })

      let result: GradeResult
      try {
        if (isImageFile(file)) {
          setProgress({ current: i + 1, total: studentFiles.length, currentLabel: `OCR: ${file.name}` })
        }
        const text = await extractFileText(file)
        setProgress({ current: i + 1, total: studentFiles.length, currentLabel: file.name })
        result = await gradeOne(text, scheme, file.name, signal)
      } catch (e) {
        if ((e as Error).name === 'AbortError') break
        const marks = Math.max(1, Number(totalMarks) || 100)
        result = {
          studentLabel: file.name, score: 0, totalMarks: marks, percentage: 0,
          grade: 'F', classification: 'Fail', summary: '', feedback: '',
          fullReport: '', expanded: false, error: (e as Error).message,
        }
      }

      accumulated.push(result)
      setResults([...accumulated])
    }

    setProgress(null)
    setPhase('done')
  }

  function handleStop() { abortRef.current?.abort(); setProgress(null); setPhase('done') }

  function handleReset() {
    abortRef.current?.abort()
    setPhase('idle'); setProgress(null); setResults([]); setError('')
  }

  function toggleExpand(idx: number) {
    setResults((prev) => prev.map((r, i) => i === idx ? { ...r, expanded: !r.expanded } : r))
  }

  // Derived stats
  const ok     = results.filter((r) => !r.error)
  const avg    = ok.length ? ok.reduce((s, r) => s + r.percentage, 0) / ok.length : 0
  const high   = ok.length ? Math.max(...ok.map((r) => r.percentage)) : 0
  const low    = ok.length ? Math.min(...ok.map((r) => r.percentage)) : 0
  const pass   = ok.length ? (ok.filter((r) => r.grade !== 'F').length / ok.length) * 100 : 0
  const dist   = (['A','B','C','D','F'] as Grade[]).map((g) => ({ g, n: ok.filter((r) => r.grade === g).length }))

  const schemeReady =
    schemeMode === 'library' ? (!!selectedSchemeId && !schemeLoading) :
    schemeMode === 'upload'  ? !!schemeFile?.text :
    true // paste mode: optional scheme is always "ready"

  const canGrade = studentFiles.length > 0 && schemeReady && phase !== 'grading'

  // CSS helpers
  const sel    = 'w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
  const tabCls = (active: boolean) =>
    cn('flex-1 py-1 text-xs transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left panel ───────────────────────────────────────────────── */}
      <div className="w-[420px] shrink-0 flex flex-col border-r border-border bg-background">

        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm">AI Marking Assistant</h1>
              <p className="text-xs text-muted-foreground">Grade multiple student scripts in one session</p>
            </div>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── Step 1: Marking Scheme ────────────────────────────── */}
          <section className="space-y-2.5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">1 · Marking Scheme</p>

            <div className="flex rounded-lg border border-border overflow-hidden text-xs">
              {(['library', 'upload', 'paste'] as SchemeMode[]).map((m) => (
                <button key={m} type="button" onClick={() => setSchemeMode(m)} className={tabCls(schemeMode === m)}>
                  {m === 'library' ? 'Library' : m === 'upload' ? 'Upload' : 'Paste'}
                </button>
              ))}
            </div>

            {schemeMode === 'library' && (
              <div className="space-y-1.5">
                <select
                  value={selectedSchemeId}
                  onChange={(e) => void handleLibrarySelect(e.target.value)}
                  disabled={phase === 'grading' || libraryLoading}
                  className={sel}
                >
                  <option value="">
                    {libraryLoading ? 'Loading schemes…' : '— Select a marking scheme —'}
                  </option>
                  {librarySchemes.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
                {!libraryLoading && librarySchemes.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    No marking schemes found. Generate one or switch to Upload / Paste.
                  </p>
                )}
                {schemeLoading && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading scheme content…
                  </div>
                )}
                {selectedSchemeId && !schemeLoading && schemeContent !== null && (
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="text-[10px] text-success font-medium">
                      Scheme ready · {(schemeContent.length).toLocaleString()} chars
                    </span>
                  </div>
                )}
              </div>
            )}

            {schemeMode === 'upload' && (
              <div className="space-y-1.5">
                {schemeFile ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
                    {schemeFile.loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />
                    ) : schemeFile.error ? (
                      <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{schemeFile.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {schemeFile.loading ? 'Extracting text…'
                          : schemeFile.error ?? `${schemeFile.text?.length.toLocaleString()} chars extracted`}
                      </p>
                    </div>
                    {!schemeFile.loading && phase !== 'grading' && (
                      <button type="button" onClick={() => setSchemeFile(null)}
                        className="text-muted-foreground hover:text-error transition-colors shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    onDrop={(e) => { e.preventDefault(); setSchemeDragging(false); const f = e.dataTransfer.files[0]; if (f) void handleSchemeFile(f) }}
                    onDragOver={(e) => { e.preventDefault(); setSchemeDragging(true) }}
                    onDragLeave={() => setSchemeDragging(false)}
                    onClick={() => phase !== 'grading' && schemeInputRef.current?.click()}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 cursor-pointer transition-colors',
                      schemeDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
                      phase === 'grading' && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Drop or click to upload marking scheme</p>
                    <p className="text-[10px] text-muted-foreground/60">PDF, DOCX, TXT · Max 20 MB</p>
                  </div>
                )}
                <input ref={schemeInputRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleSchemeFile(f) }} />
              </div>
            )}

            {schemeMode === 'paste' && (
              <div>
                <textarea
                  value={schemePaste}
                  onChange={(e) => setSchemePaste(e.target.value)}
                  disabled={phase === 'grading'}
                  rows={5}
                  placeholder="Paste your marking scheme here. Leave blank to use general academic standards."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60 placeholder:text-muted-foreground"
                />
                {schemePaste && (
                  <p className="text-[10px] text-muted-foreground mt-1">{schemePaste.length.toLocaleString()} chars</p>
                )}
              </div>
            )}
          </section>

          {/* ── Step 2: Student Scripts ───────────────────────────── */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">2 · Student Scripts</p>
              {studentFiles.length > 0 && (
                <Badge variant="default" size="sm">
                  {studentFiles.length} file{studentFiles.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDrop={(e) => { e.preventDefault(); setStudentDragging(false); addStudentFiles(e.dataTransfer.files) }}
              onDragOver={(e) => { e.preventDefault(); setStudentDragging(true) }}
              onDragLeave={() => setStudentDragging(false)}
              onClick={() => phase !== 'grading' && studentInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-4 cursor-pointer transition-colors',
                studentDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
                phase === 'grading' && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Drop scripts here or click to add</p>
              <p className="text-[10px] text-muted-foreground/60">PDF, DOCX, TXT, Images · Multiple files allowed</p>
            </div>
            <input ref={studentInputRef} type="file" className="hidden" multiple accept=".pdf,.docx,.doc,.txt,.md,.jpg,.jpeg,.png,.webp"
              onChange={(e) => { if (e.target.files) addStudentFiles(e.target.files) }} />

            {/* File list */}
            {studentFiles.length > 0 && (
              <ul className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {studentFiles.map((f, i) => {
                  const result = results[i]
                  const isGradingThis = phase === 'grading' && progress && progress.current - 1 === i
                  return (
                    <li key={`${f.name}:${f.size}`}
                      className="flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5">
                      <FileIcon name={f.name} />
                      <span className="flex-1 text-xs truncate text-foreground">{f.name}</span>
                      {isGradingThis && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                      {result && !result.error && <GradePill grade={result.grade} />}
                      {result?.error && <AlertCircle className="h-3.5 w-3.5 text-error shrink-0" />}
                      {phase !== 'grading' && (
                        <button type="button" onClick={() => setStudentFiles((p) => p.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-error transition-colors shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ── Step 3: Assessment Details ────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">3 · Assessment Details</p>
            <TextField
              label="Assessment title"
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              disabled={phase === 'grading'}
              placeholder="e.g. Mid-Semester Exam — COS 301"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Total marks"
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                disabled={phase === 'grading'}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Level</label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  disabled={phase === 'grading'}
                  className={sel}
                >
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </section>
        </div>

        {/* ── Bottom actions ────────────────────────────────────── */}
        <div className="p-5 border-t border-border space-y-2.5 shrink-0">
          {/* Progress bar */}
          {phase === 'grading' && progress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate max-w-[220px]">Grading: {progress.currentLabel}</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {phase === 'grading' ? (
            <Button variant="danger" className="w-full" leftIcon={<Square className="h-4 w-4" />} onClick={handleStop}>
              Stop grading
            </Button>
          ) : phase === 'done' ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={handleReset}>
                New session
              </Button>
              {results.length > 0 && (
                <Button variant="primary" className="w-full" leftIcon={<Download className="h-4 w-4" />}
                  onClick={() => exportCsv(results, assessmentTitle)}>
                  Export Grade Book (CSV)
                </Button>
              )}
            </div>
          ) : (
            <Button
              variant="primary"
              className="w-full"
              leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => void handleGradeAll()}
              disabled={!canGrade}
            >
              {studentFiles.length === 0
                ? 'Upload student scripts first'
                : !schemeReady
                ? 'Select or add a marking scheme'
                : `Grade ${studentFiles.length} Script${studentFiles.length !== 1 ? 's' : ''}`}
            </Button>
          )}

          {phase === 'idle' && (
            <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
              AI marking is a decision-support tool — always review results before releasing marks.
            </p>
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Grade Book</span>
            {phase === 'done' && results.length > 0 && (
              <>
                <Badge variant="success" size="sm">Complete</Badge>
                <span className="text-xs text-muted-foreground">
                  {results.length} student{results.length !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {phase === 'grading' && (
              <Badge variant="warning" size="sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Grading…
                </span>
              </Badge>
            )}
          </div>
          {results.length > 0 && (
            <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}
              onClick={() => exportCsv(results, assessmentTitle)}>
              Export CSV
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <Alert variant="error" description={error} className="mb-4" />}

          {/* Empty state */}
          {phase === 'idle' && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
              <Users className="h-12 w-12 opacity-20" />
              <div>
                <p className="font-medium text-foreground">Ready to mark</p>
                <p className="text-sm mt-1 max-w-xs">
                  Upload student scripts, add your marking scheme, then click Grade to build a complete grade book.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 max-w-md w-full">
                {[
                  { step: '1', label: 'Add marking scheme', desc: 'Library, upload, or paste' },
                  { step: '2', label: 'Upload scripts',     desc: 'PDF, DOCX, TXT, or Images — any number' },
                  { step: '3', label: 'Click Grade',        desc: 'AI builds a full grade book' },
                ].map((s) => (
                  <div key={s.step} className="rounded-xl border border-border bg-card p-3 text-center">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mx-auto mb-2">
                      {s.step}
                    </div>
                    <p className="text-xs font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preparing state (no results yet but grading) */}
          {phase === 'grading' && results.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">
                {progress ? `Grading ${progress.current} of ${progress.total}…` : 'Preparing…'}
              </p>
              {progress && <p className="text-xs text-muted-foreground">{progress.currentLabel}</p>}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-5">

              {/* Stats strip */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Class Average', value: ok.length ? `${avg.toFixed(1)}%` : '—' },
                  { label: 'Highest',       value: ok.length ? `${high.toFixed(1)}%` : '—' },
                  { label: 'Lowest',        value: ok.length ? `${low.toFixed(1)}%` : '—' },
                  { label: 'Pass Rate',     value: ok.length ? `${pass.toFixed(0)}%` : '—' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Grade distribution */}
              {ok.length > 0 && (
                <div className="rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2.5">Grade Distribution</p>
                  <div className="flex items-center gap-4">
                    {dist.filter(({ n }) => n > 0).map(({ g, n }) => (
                      <div key={g} className="flex items-center gap-1.5">
                        <GradePill grade={g} />
                        <span className="text-sm font-semibold text-foreground">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Results table */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Student</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground whitespace-nowrap">Score</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">%</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Grade</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Summary</th>
                      <th className="px-3 py-2.5 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <Fragment key={`student-${i}`}>
                        {/* Main row */}
                        <tr className={cn(
                          'border-b border-border last:border-0 transition-colors hover:bg-muted/20',
                          r.expanded && 'bg-muted/10',
                        )}>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <FileIcon name={r.studentLabel} />
                              <span className="font-medium text-foreground truncate max-w-[140px]">{r.studentLabel}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-foreground">
                            {r.error
                              ? <AlertCircle className="h-3.5 w-3.5 text-error mx-auto" />
                              : `${r.score}/${r.totalMarks}`}
                          </td>
                          <td className="px-3 py-2.5 text-center text-foreground">
                            {r.error ? '—' : `${r.percentage.toFixed(1)}%`}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {r.error
                              ? <span className="text-[10px] text-error">Error</span>
                              : <GradePill grade={r.grade} />}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            <span className="block truncate max-w-[220px]">{r.error ?? r.summary}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {(r.fullReport || r.feedback) && (
                              <button type="button" onClick={() => toggleExpand(i)}
                                className="text-muted-foreground hover:text-foreground transition-colors">
                                {r.expanded
                                  ? <ChevronUp className="h-3.5 w-3.5" />
                                  : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {r.expanded && (r.fullReport || r.feedback) && (
                          <tr className="border-b border-border last:border-0">
                            <td colSpan={6} className="px-4 pb-4 pt-2">
                              <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                                {r.feedback && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Feedback for Student
                                    </p>
                                    <p className="text-xs text-foreground leading-relaxed">{r.feedback}</p>
                                  </div>
                                )}
                                {r.fullReport && (
                                  <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                      Full Assessment Report
                                    </p>
                                    <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                                      {r.fullReport}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}

                    {/* In-progress placeholder rows (still queued) */}
                    {phase === 'grading' && progress &&
                      Array.from({ length: Math.max(0, studentFiles.length - results.length) }).map((_, i) => {
                        const f = studentFiles[results.length + i]
                        const isCurrent = i === 0
                        return (
                          <tr key={`pending-${i}`} className="border-b border-border last:border-0 opacity-40">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                {f && <FileIcon name={f.name} />}
                                <span className="text-foreground truncate max-w-[140px]">{f?.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {isCurrent
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary mx-auto" />
                                : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">—</td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">—</td>
                            <td className="px-4 py-2.5 text-muted-foreground" colSpan={2}>
                              {isCurrent ? 'Grading…' : 'Queued'}
                            </td>
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
