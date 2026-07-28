import { useState, useRef, useCallback } from 'react'
import {
  ClipboardCheck, Upload, FileText, File, AlertCircle, X,
  Loader2, Sparkles, Square, RotateCcw, Copy, Check,
  ExternalLink, ChevronDown, ChevronUp, BookOpen,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { ROUTES, buildRoute } from '@/constants/routes'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedText {
  filename: string
  chars:    number
  text:     string
}

type InputMode = 'upload' | 'paste'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(name: string) {
  if (name.endsWith('.pdf'))              return <FileText className="h-4 w-4 text-red-500" />
  if (name.endsWith('.docx') || name.endsWith('.doc')) return <FileText className="h-4 w-4 text-blue-500" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]

async function extractFile(file: File): Promise<ExtractedText> {
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

// ── FileOrPasteInput ──────────────────────────────────────────────────────────

function FileOrPasteInput({
  label,
  placeholder,
  extracted,
  pasteText,
  onExtracted,
  onPasteChange,
  onClear,
  disabled,
}: {
  label:         string
  placeholder:   string
  extracted:     ExtractedText | null
  pasteText:     string
  onExtracted:   (e: ExtractedText) => void
  onPasteChange: (t: string) => void
  onClear:       () => void
  disabled:      boolean
}) {
  const [mode,            setMode]            = useState<InputMode>('upload')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [dragging,        setDragging]        = useState(false)
  const [pendingFilename, setPendingFilename] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    if (file.size > 20 * 1024 * 1024) { setError('File exceeds 20 MB'); return }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setError('Unsupported type — use PDF, DOCX, or TXT'); return
    }
    setPendingFilename(file.name)
    setLoading(true)
    try {
      const result = await extractFile(file)
      setPendingFilename(null)
      onExtracted(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const hasContent = extracted !== null || pasteText.trim().length > 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs">
          <button type="button" onClick={() => setMode('upload')}
            className={cn('px-2.5 py-1 transition-colors', mode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
            Upload
          </button>
          <button type="button" onClick={() => setMode('paste')}
            className={cn('px-2.5 py-1 transition-colors', mode === 'paste' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted')}>
            Paste text
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        extracted ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
            {fileIcon(extracted.filename)}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{extracted.filename}</p>
              <p className="text-[10px] text-muted-foreground">{extracted.chars.toLocaleString()} characters extracted</p>
            </div>
            {!disabled && (
              <button type="button" onClick={onClear} className="text-muted-foreground hover:text-error transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ) : loading && pendingFilename ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">{pendingFilename}</p>
              <p className="text-[10px] text-muted-foreground">Extracting text…</p>
            </div>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !disabled && inputRef.current?.click()}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 cursor-pointer transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/30',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Drop file or click to browse</p>
            <p className="text-[10px] text-muted-foreground/60">PDF, DOCX, TXT · Max 20 MB</p>
          </div>
        )
      ) : (
        <div className="relative">
          <textarea
            value={pasteText}
            onChange={(e) => onPasteChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={5}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60 placeholder:text-muted-foreground"
          />
          {pasteText && !disabled && (
            <button type="button" onClick={onClear}
              className="absolute top-2 right-2 text-muted-foreground hover:text-error transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {pasteText && (
            <p className="text-[10px] text-muted-foreground mt-1">{pasteText.length.toLocaleString()} characters</p>
          )}
        </div>
      )}

      <input ref={inputRef} type="file" className="hidden"
        accept=".pdf,.docx,.doc,.txt,.md"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        disabled={disabled} />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}

      {hasContent && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-[10px] text-success font-medium">Content ready</span>
        </div>
      )}
    </div>
  )
}

// ── System & grading prompt builders ─────────────────────────────────────────

const GRADING_SYSTEM_PROMPT = `You are an expert academic grader with deep knowledge of Nigerian and African higher education standards.
You assess student submissions fairly, consistently, and constructively against the provided marking scheme or rubric.
Your grade reports are detailed, evidence-based, and cite specific parts of the student's submission to justify each mark awarded.
Format all output in clean, structured Markdown. Be encouraging where deserved and specific about areas for improvement.
Never fabricate content — only grade what is actually in the submission.`

function buildGradingPrompt(
  submission: string,
  rubric: string,
  assignmentTitle: string,
  courseTitle: string,
  courseCode: string,
  academicLevel: string,
  assignmentType: string,
  totalMarks: string,
  customInstructions: string,
): string {
  return `## GRADING TASK

Please grade the following student submission.

**Assignment:** ${assignmentTitle || '[Untitled Assignment]'}
**Course:** ${courseTitle || '[Course Name]'}${courseCode ? ` (${courseCode})` : ''}
**Academic Level:** ${academicLevel}
**Assignment Type:** ${assignmentType}
**Total Marks:** ${totalMarks}
${customInstructions ? `**Special Instructions:** ${customInstructions}` : ''}

---

## MARKING SCHEME / RUBRIC

${rubric || '_No rubric provided — use general academic standards appropriate to the level and assignment type._'}

---

## STUDENT SUBMISSION

${submission || '_No submission provided._'}

---

## GRADING INSTRUCTIONS

Carefully read the student submission and grade it against the rubric above. Produce a complete grade report in the following format:

# Grade Report: ${assignmentTitle || 'Student Submission'}
**Course:** ${courseTitle || '[Course]'}${courseCode ? ` (${courseCode})` : ''} | **Level:** ${academicLevel}

---

## Executive Summary

| | |
|---|---|
| **Total Marks Available** | ${totalMarks} |
| **Marks Awarded** | [X] / ${totalMarks} |
| **Percentage** | [X]% |
| **Grade** | [A / B / C / D / F] |
| **Classification** | [Distinction / Credit / Pass / Marginal Pass / Fail] |

> [One-sentence overall assessment of the submission quality]

---

## Criterion-by-Criterion Assessment

*For each criterion in the rubric, award marks and justify with direct reference to the submission.*

[For each criterion:]
### [Criterion Name] — [X] / [Max Marks]
**Justification:** [Specific evidence from the submission that justifies this mark. Quote or paraphrase exact sections where relevant.]

---

## Strengths

*What the student did well — be specific and encouraging:*

- [Specific strength with reference to the submission]
- [Another specific strength]
- [Continue as needed]

---

## Areas for Improvement

*Specific, actionable gaps — reference exactly where the student fell short:*

- [Specific gap with reference to what was missing or incorrect]
- [Another area for improvement with guidance]
- [Continue as needed]

---

## Feedback for Student

[Write 2–4 constructive paragraphs directly addressing the student. Acknowledge their effort, highlight key strengths, identify the most important areas to improve, and suggest specific actions they can take to do better next time. Be encouraging but honest. Use second-person ("You demonstrated…", "To improve…").]

---

## Final Grade Summary

| Criterion | Max Marks | Awarded | Comment |
|-----------|-----------|---------|---------|
[One row per criterion from the rubric]
| **Total** | **${totalMarks}** | **[X]** | |

---

*Graded by LectureCraft AI Grading Assistant · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}*

Replace ALL placeholder values with actual marks, evidence, and feedback based solely on the student submission and the rubric provided.`
}

// ── Main page ─────────────────────────────────────────────────────────────────

const LEVELS = ['ND', 'HND', 'BSc', 'MSc', 'MBA', 'PhD', 'Professional']
const TYPES  = [
  'Essay', 'Assignment', 'Research Report', 'Case Study', 'Examination',
  'Laboratory Report', 'Group Project', 'Presentation', 'Portfolio',
  'Dissertation / Thesis', 'Problem-solving / Numerical', 'Reflective Journal',
]

export default function GradingAssistantPage() {
  const navigate = useNavigate()

  // Submission
  const [submissionFile,  setSubmissionFile]  = useState<ExtractedText | null>(null)
  const [submissionPaste, setSubmissionPaste] = useState('')

  // Rubric
  const [rubricFile,  setRubricFile]  = useState<ExtractedText | null>(null)
  const [rubricPaste, setRubricPaste] = useState('')

  // Config
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [courseTitle,     setCourseTitle]     = useState('')
  const [courseCode,      setCourseCode]      = useState('')
  const [academicLevel,   setAcademicLevel]   = useState('BSc')
  const [assignmentType,  setAssignmentType]  = useState('Assignment')
  const [totalMarks,      setTotalMarks]      = useState('100')
  const [customNotes,     setCustomNotes]     = useState('')

  // Output
  const [output,      setOutput]      = useState('')
  const [isGrading,   setIsGrading]   = useState(false)
  const [isDone,       setIsDone]      = useState(false)
  const [error,        setError]       = useState('')
  const [documentId,   setDocumentId]  = useState<string | null>(null)
  const [copied,       setCopied]      = useState(false)
  const [advOpen,      setAdvOpen]     = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const submissionText = submissionFile?.text ?? submissionPaste
  const rubricText     = rubricFile?.text     ?? rubricPaste
  const canGrade       = submissionText.trim().length > 0 && !isGrading

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setOutput(''); setIsGrading(false); setIsDone(false); setError(''); setDocumentId(null)
  }, [])

  async function handleGrade() {
    if (!canGrade) return
    reset()
    setIsGrading(true)

    const prompt = buildGradingPrompt(
      submissionText, rubricText,
      assignmentTitle, courseTitle, courseCode,
      academicLevel, assignmentType, totalMarks, customNotes,
    )

    abortRef.current = new AbortController()

    try {
      const base  = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
      const token = localStorage.getItem('accessToken') ?? ''

      const res = await fetch(`${base}/ai/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt, systemPrompt: GRADING_SYSTEM_PROMPT, moduleType: 'grading-assistant' }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const e = await res.json().catch(() => ({ message: 'Grading failed' })) as { message?: string }
        throw new Error(e.message ?? 'Grading failed')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; documentId?: string }
            if (parsed.chunk)                          setOutput((p) => p + parsed.chunk)
            if (parsed.done && parsed.documentId)      { setDocumentId(parsed.documentId); setIsDone(true) }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message ?? 'Something went wrong')
    } finally {
      setIsGrading(false)
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output).catch(() => null)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const sel = 'w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
  const wordCount = output.split(/\s+/).filter(Boolean).length

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left panel: config ─────────────────────────────────────────── */}
      <div className="w-[380px] shrink-0 flex flex-col border-r border-border bg-background overflow-y-auto">

        {/* Header */}
        <div className="p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm">AI Grading Assistant</h1>
              <p className="text-xs text-muted-foreground">Grade student submissions against your rubric</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Student submission */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">1 · Student Submission</p>
            <FileOrPasteInput
              label=""
              placeholder="Paste the student's submission here…"
              extracted={submissionFile}
              pasteText={submissionPaste}
              onExtracted={setSubmissionFile}
              onPasteChange={setSubmissionPaste}
              onClear={() => { setSubmissionFile(null); setSubmissionPaste('') }}
              disabled={isGrading}
            />
          </div>

          {/* Rubric */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">2 · Marking Scheme / Rubric <span className="text-muted-foreground font-normal normal-case">(optional)</span></p>
            <FileOrPasteInput
              label=""
              placeholder="Paste your marking scheme or rubric here. If left blank, the AI will use general academic standards."
              extracted={rubricFile}
              pasteText={rubricPaste}
              onExtracted={setRubricFile}
              onPasteChange={setRubricPaste}
              onClear={() => { setRubricFile(null); setRubricPaste('') }}
              disabled={isGrading}
            />
          </div>

          {/* Assignment info */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">3 · Assignment Details</p>
            <TextField label="Assignment title" value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)} disabled={isGrading} placeholder="e.g. Research Assignment on Database Design" />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Course title" value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)} disabled={isGrading} placeholder="e.g. Database Management" />
              <TextField label="Course code" value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)} disabled={isGrading} placeholder="e.g. COS 301" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Academic level</label>
                <select value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} disabled={isGrading} className={sel}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <TextField label="Total marks" type="number" value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)} disabled={isGrading} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignment type</label>
              <select value={assignmentType} onChange={(e) => setAssignmentType(e.target.value)} disabled={isGrading} className={sel}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Advanced */}
          <div className="rounded-xl border border-border bg-muted/20">
            <button type="button" onClick={() => setAdvOpen((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors rounded-xl">
              <span>Additional grading notes</span>
              {advOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            {advOpen && (
              <div className="border-t border-border px-4 pb-4 pt-3">
                <textarea value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} disabled={isGrading}
                  rows={3} placeholder="e.g. This is a group submission — assess individual contribution only. Deduct marks for late submission."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none disabled:opacity-60 placeholder:text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="p-5 border-t border-border space-y-2.5 shrink-0">
          {isGrading ? (
            <Button variant="danger" className="w-full" leftIcon={<Square className="h-4 w-4" />}
              onClick={() => { abortRef.current?.abort(); setIsGrading(false) }}>
              Stop grading
            </Button>
          ) : isDone ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={reset}>Grade again</Button>
              {documentId && (
                <Button variant="primary" className="w-full" leftIcon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: documentId }))}>
                  Open in editor
                </Button>
              )}
            </div>
          ) : (
            <Button variant="primary" className="w-full" leftIcon={<Sparkles className="h-4 w-4" />}
              onClick={() => void handleGrade()} disabled={!canGrade}>
              {canGrade ? 'Grade submission' : 'Upload a submission first'}
            </Button>
          )}

          {!isGrading && !isDone && (
            <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
              AI grading is a decision-support tool. Always review the report before returning marks to students.
            </p>
          )}
        </div>
      </div>

      {/* ── Right panel: output ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Grade Report</span>
            {isDone && (
              <>
                <Badge variant="success" size="sm">Complete</Badge>
                <span className="text-xs text-muted-foreground">{wordCount.toLocaleString()} words</span>
              </>
            )}
            {isGrading && (
              <Badge variant="warning" size="sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Grading…
                </span>
              </Badge>
            )}
          </div>
          {output && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copyOutput()}>
                {copied ? 'Copied!' : 'Copy report'}
              </Button>
              {documentId && (
                <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}
                  onClick={() => navigate(buildRoute(ROUTES.GEN_DOCUMENT_DETAIL, { id: documentId }))}>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && <Alert variant="error" description={error} className="mb-4" />}

          {!output && !isGrading && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-4">
              <ClipboardCheck className="h-12 w-12 opacity-20" />
              <div>
                <p className="font-medium text-foreground">Ready to grade</p>
                <p className="text-sm mt-1 max-w-xs">Upload a student submission on the left, optionally add your rubric, configure the assignment details, and click Grade.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 max-w-md w-full">
                {[
                  { step: '1', label: 'Upload submission', desc: 'PDF, DOCX, or paste text' },
                  { step: '2', label: 'Add rubric', desc: 'Optional — paste or upload' },
                  { step: '3', label: 'Click Grade', desc: 'AI produces a full report' },
                ].map((s) => (
                  <div key={s.step} className="rounded-xl border border-border bg-card p-3 text-center">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center mx-auto mb-2">{s.step}</div>
                    <p className="text-xs font-medium text-foreground">{s.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(output || isGrading) && (
            <div className={cn(
              'prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap break-words',
              'prose-headings:font-bold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
              'prose-table:text-xs prose-td:py-1 prose-th:py-1',
            )}>
              {output}
              {isGrading && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-text-bottom" />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
