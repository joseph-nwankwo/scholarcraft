import { useState, useRef } from 'react'
import {
  ShieldCheck, AlertTriangle, Bot, FileSearch, Upload,
  Loader2, RotateCcw, Copy, Download, Printer, Check,
  Eye, Pencil, History, X, Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiClient } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { printDocument } from '@/lib/print'

// ── Types ──────────────────────────────────────────────────────────────────────

type CheckType   = 'ai' | 'plagiarism'
type RiskLevel   = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
type SectionFlag = 'ai_likely' | 'suspicious' | 'clean'

interface Section { text: string; flag: SectionFlag; reason: string }

interface PlagiarismResult {
  aiScore: number
  originalityScore: number
  riskLevel: RiskLevel
  wordCount: number
  summary: string
  aiIndicators: string[]
  originalityIndicators: string[]
  sections: Section[]
  recommendations: string[]
  checkedAt: string
  title?: string
}

interface HistoryItem {
  id: string; title: string; aiScore: number; originalityScore: number
  riskLevel: RiskLevel; wordCount: number; checks: CheckType[]; checkedAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  LOW:       { label: 'Low Risk',       color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' },
  MEDIUM:    { label: 'Medium Risk',    color: 'text-yellow-700 dark:text-yellow-400',bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' },
  HIGH:      { label: 'High Risk',      color: 'text-orange-700 dark:text-orange-400',bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800' },
  VERY_HIGH: { label: 'Very High Risk', color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' },
}

// ── Build the markdown report ──────────────────────────────────────────────────

function buildReport(result: PlagiarismResult, checks: CheckType[]): string {
  const doAI   = checks.includes('ai')
  const doPlag = checks.includes('plagiarism')
  const risk   = RISK_META[result.riskLevel]
  const date   = new Date(result.checkedAt).toLocaleString()

  const lines: string[] = [
    `# Academic Integrity Analysis Report`,
    result.title ? `**Document:** ${result.title}` : '',
    `**Checked:** ${date} &nbsp;·&nbsp; **Words:** ${result.wordCount}`,
    '',
    '---',
    '',
    `## ${risk.label} — Executive Summary`,
    '',
    `> ${result.summary}`,
    '',
  ]

  if (doAI) {
    lines.push('---', '', `## AI-Content Detection`, '')
    lines.push(`**AI Likelihood Score: ${result.aiScore}%**`)
    lines.push('')
    lines.push(
      result.aiScore < 30  ? '*The text shows few AI-writing patterns and reads as predominantly human-authored.*' :
      result.aiScore < 60  ? '*The text contains moderate AI-writing signals. Manual review recommended.*' :
      result.aiScore < 80  ? '*Strong AI-writing patterns detected. High probability of AI involvement.*' :
                             '*Extremely strong AI-generation signals. This text was very likely produced by an AI model.*',
    )
    lines.push('')
    if (result.aiIndicators.length > 0) {
      lines.push('### Detected Patterns')
      result.aiIndicators.forEach((ind) => lines.push(`- ${ind}`))
      lines.push('')
    } else {
      lines.push('*No AI-writing patterns found.*', '')
    }
  }

  if (doPlag) {
    lines.push('---', '', `## Originality Analysis`, '')
    lines.push(`**Originality Score: ${result.originalityScore}%**`)
    lines.push('')
    lines.push(
      result.originalityScore > 70 ? '*The text appears largely original with minimal copy-paste indicators.*' :
      result.originalityScore > 40 ? '*Several originality concerns were identified. Cross-reference with source material.*' :
                                     '*Multiple strong indicators of unattributed sourcing detected.*',
    )
    lines.push('')
    if (result.originalityIndicators.length > 0) {
      lines.push('### Concerns Identified')
      result.originalityIndicators.forEach((ind) => lines.push(`- ${ind}`))
      lines.push('')
    } else {
      lines.push('*No originality concerns found.*', '')
    }
  }

  const flagged = result.sections.filter((s) => s.flag !== 'clean')
  if (flagged.length > 0) {
    lines.push('---', '', '## Flagged Passages', '')
    flagged.forEach((s, i) => {
      const label = s.flag === 'ai_likely' ? '🔴 AI-Likely' : '🟡 Suspicious'
      lines.push(`### ${i + 1}. ${label}`)
      lines.push(`> "${s.text}"`)
      lines.push('')
      lines.push(`**Finding:** ${s.reason}`)
      lines.push('')
    })
  }

  const clean = result.sections.filter((s) => s.flag === 'clean')
  if (clean.length > 0) {
    lines.push('---', '', '## Passages That Appear Human-Written', '')
    clean.forEach((s, i) => {
      lines.push(`### ${i + 1}. 🟢 Clean`)
      lines.push(`> "${s.text}"`)
      lines.push('')
      lines.push(`**Note:** ${s.reason}`)
      lines.push('')
    })
  }

  if (result.recommendations.length > 0) {
    lines.push('---', '', '## Recommendations', '')
    result.recommendations.forEach((r, i) => lines.push(`${i + 1}. ${r}`))
    lines.push('')
  }

  lines.push(
    '---',
    '',
    '*This analysis uses AI pattern recognition to identify linguistic indicators. Results are indicative only and should not be used as sole grounds for academic misconduct decisions.*',
  )

  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

// ── Highlighted text view ─────────────────────────────────────────────────────

interface Span { text: string; flag: SectionFlag | null }

function buildSpans(text: string, sections: Section[]): Span[] {
  const flagged = sections.filter((s) => s.flag !== 'clean')

  // Build a set of character-range marks
  const marks: Array<{ start: number; end: number; flag: SectionFlag }> = []

  for (const sec of flagged) {
    // Try to match the excerpt (first 60 chars to stay within the 80-char limit)
    const needle = sec.text.slice(0, 60).toLowerCase()
    const haystack = text.toLowerCase()
    const idx = haystack.indexOf(needle)
    if (idx !== -1) {
      marks.push({ start: idx, end: idx + sec.text.length, flag: sec.flag })
    }
  }

  if (marks.length === 0) return [{ text, flag: null }]

  // Sort and deduplicate overlapping ranges
  marks.sort((a, b) => a.start - b.start)

  const spans: Span[] = []
  let pos = 0
  for (const m of marks) {
    if (m.start < pos) continue
    if (m.start > pos) spans.push({ text: text.slice(pos, m.start), flag: null })
    spans.push({ text: text.slice(m.start, m.end), flag: m.flag })
    pos = m.end
  }
  if (pos < text.length) spans.push({ text: text.slice(pos), flag: null })
  return spans
}

function HighlightedText({ text, sections }: { text: string; sections: Section[] }) {
  const spans = buildSpans(text, sections)
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground p-3 border border-input rounded-lg bg-background min-h-[260px]">
      {spans.map((span, i) => {
        if (!span.flag) return <span key={i}>{span.text}</span>
        return (
          <mark key={i} title={span.flag === 'ai_likely' ? 'AI-likely passage' : 'Suspicious passage'}
            className={cn(
              'rounded-sm px-0.5 not-italic',
              span.flag === 'ai_likely'
                ? 'bg-violet-200/80 border-b-2 border-violet-500 dark:bg-violet-800/50 dark:border-violet-400'
                : 'bg-orange-200/80 border-b-2 border-orange-500 dark:bg-orange-800/50 dark:border-orange-400',
            )}>
            {span.text}
          </mark>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PlagiarismCheckPage() {
  const [text, setText]           = useState('')
  const [title, setTitle]         = useState('')
  const [check, setCheck]         = useState<CheckType>('ai')
  const [result, setResult]       = useState<PlagiarismResult | null>(null)
  const [checkedText, setCheckedText] = useState('')
  const [history, setHistory]     = useState<HistoryItem[]>([])
  const [loading, setLoading]     = useState(false)
  const [histLoading, setHistLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)
  const [viewMode, setViewMode]   = useState<'edit' | 'annotated'>('edit')
  const [selection, setSelection] = useState({ start: 0, end: 0 })
  const reportRef                 = useRef<HTMLDivElement>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  const checks: CheckType[] = [check]

  const selectedText = text.slice(selection.start, selection.end)
  const hasSelection = selection.end > selection.start && selectedText.trim().length > 0
  const selectionWordCount = selectedText.trim() ? selectedText.trim().split(/\s+/).filter(Boolean).length : 0

  function trackSelection(el: HTMLTextAreaElement) {
    setSelection({ start: el.selectionStart, end: el.selectionEnd })
  }

  const fileRef = useRef<HTMLInputElement>(null)
  async function handleFile(file: File) {
    if (file.type === 'text/plain') {
      setText(await file.text())
      setSelection({ start: 0, end: 0 })
    } else {
      setError('Only .txt files are supported. Paste other formats directly.')
    }
  }

  async function runCheck() {
    const source = hasSelection ? selectedText : text
    const trimmed = source.trim()
    const wc = trimmed.split(/\s+/).filter(Boolean).length
    if (wc < 30) {
      setError(hasSelection ? 'Select at least 30 words to analyse.' : 'Please enter at least 30 words for a meaningful analysis.')
      return
    }
    setLoading(true); setError(''); setResult(null); setViewMode('edit')
    try {
      const res = await apiClient.post<{ status: string; data: PlagiarismResult }>(
        '/plagiarism/check',
        { text: trimmed, title: title.trim() || undefined, checks },
      )
      setResult(res.data.data)
      setCheckedText(trimmed)
      setViewMode('annotated')
    } catch (e) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Analysis failed. Please try again.')
    } finally { setLoading(false) }
  }

  async function loadHistory() {
    setHistLoading(true)
    try {
      const res = await apiClient.get<{ status: string; data: HistoryItem[] }>('/plagiarism/history')
      setHistory(res.data.data); setShowHistory(true)
    } catch { /* ignore */ } finally { setHistLoading(false) }
  }

  async function copyReport() {
    if (!result) return
    await navigator.clipboard.writeText(buildReport(result, checks))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function downloadReport() {
    if (!result) return
    const blob = new Blob([buildReport(result, checks)], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `plagiarism-report-${Date.now()}.md`; a.click()
    URL.revokeObjectURL(a.href)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const risk = result ? RISK_META[result.riskLevel] : null
  const report = result ? buildReport(result, checks) : ''

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <FileSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">Plagiarism &amp; AI-Detection Check</h1>
              <p className="text-xs text-muted-foreground">Analyse text for AI-generated content and originality concerns</p>
            </div>
          </div>
          <button onClick={() => showHistory ? setShowHistory(false) : void loadHistory()}
            disabled={histLoading}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted/30 transition-colors">
            {histLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            History
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">

        {/* ── Left: Input ─────────────────────────────────────────────── */}
        <div className="lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col border-r border-border overflow-y-auto bg-background">
          <div className="p-5 space-y-4 flex-1">

            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                Document Title (optional)
              </label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Student Essay on Climate Change"
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {/* Check type — radio (one at a time) */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                Check Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'ai'          as CheckType, label: 'AI Detection',    icon: Bot,         desc: 'Detects AI-generated text patterns' },
                  { id: 'plagiarism'  as CheckType, label: 'Plagiarism Check', icon: ShieldCheck, desc: 'Checks originality & copy-paste patterns' },
                ] as const).map(({ id, label, icon: Icon, desc }) => (
                  <button key={id} type="button" onClick={() => { setCheck(id); setResult(null) }}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 rounded-xl border-2 transition-all text-left',
                      check === id
                        ? 'bg-primary/10 border-primary'
                        : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30',
                    )}>
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                        check === id ? 'border-primary' : 'border-muted-foreground/40')}>
                        {check === id && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
                      </div>
                      <Icon className={cn('h-4 w-4', check === id ? 'text-primary' : 'text-muted-foreground')} />
                      <span className={cn('text-sm font-semibold', check === id ? 'text-primary' : 'text-foreground')}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-7 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Text input / Annotated view */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Text to Analyse
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {hasSelection ? `${selectionWordCount} selected / ${wordCount} total` : `${wordCount} words`}
                  </span>
                  {result && (
                    <div className="flex rounded-md border border-border overflow-hidden text-xs">
                      <button onClick={() => setViewMode('edit')}
                        className={cn('flex items-center gap-1 px-2 py-1 transition-colors',
                          viewMode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40')}>
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => setViewMode('annotated')}
                        className={cn('flex items-center gap-1 px-2 py-1 transition-colors',
                          viewMode === 'annotated' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/40')}>
                        <Eye className="h-3 w-3" /> Annotated
                      </button>
                    </div>
                  )}
                  {!result && (
                    <>
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Upload className="h-3 w-3" /> Upload .txt
                      </button>
                      {text && (
                        <button onClick={() => { setText(''); setSelection({ start: 0, end: 0 }) }} className="text-xs text-muted-foreground hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {viewMode === 'annotated' && result
                ? <HighlightedText text={checkedText} sections={result.sections} />
                : (
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onSelect={(e) => trackSelection(e.currentTarget)}
                    rows={15}
                    placeholder="Paste the text you want to analyse here…&#10;&#10;Minimum 30 words.&#10;&#10;Select a passage to check just that part, or leave nothing selected to check the whole thing."
                    className="w-full border border-input rounded-lg p-3 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed" />
                )
              }
              {!result && hasSelection && (
                <p className="text-xs text-primary mt-1.5">
                  {selectionWordCount} word{selectionWordCount !== 1 ? 's' : ''} selected — analysis will run on just this passage.
                </p>
              )}
              <input ref={fileRef} type="file" accept=".txt" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }} />
            </div>

            {/* Legend (when annotated view is active) */}
            {viewMode === 'annotated' && result && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded-sm bg-violet-200/80 border-b-2 border-violet-500 inline-block" />
                  AI-likely
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded-sm bg-orange-200/80 border-b-2 border-orange-500 inline-block" />
                  Suspicious
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-5 rounded-sm bg-background border border-border inline-block" />
                  Clean
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <button onClick={() => void runCheck()} disabled={loading || (hasSelection ? selectionWordCount : wordCount) < 30}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Analysing…</>
                : <><Sparkles className="h-4 w-4" /> {hasSelection ? `Check Selection (${selectionWordCount} words)` : 'Run Analysis'}</>
              }
            </button>

            {result && (
              <button onClick={() => { setResult(null); setText(''); setTitle(''); setCheckedText(''); setSelection({ start: 0, end: 0 }); setViewMode('edit') }}
                className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 hover:bg-muted/30 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> New Check
              </button>
            )}

            <p className="text-xs text-muted-foreground border border-border rounded-lg p-3 bg-muted/20 leading-relaxed">
              <strong>Note:</strong> AI detection analyses linguistic patterns including perplexity, burstiness, and stylistic markers. Results are indicative — not definitive proof of AI authorship.
            </p>
          </div>
        </div>

        {/* ── Right: Report output ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-3">
              <FileSearch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Analysis Report</span>
              {result && (
                <span className={cn('text-xs font-semibold', risk!.color)}>{risk!.label}</span>
              )}
              {loading && (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Analysing…
                </span>
              )}
            </div>
            {result && (
              <div className="flex items-center gap-2">
                <button onClick={() => void copyReport()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={downloadReport}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button onClick={() => printDocument(reportRef.current?.innerHTML ?? '', 'Academic Integrity Report')}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 hover:bg-muted/40 transition-colors">
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-10">

            {/* History panel */}
            {showHistory && !result && (
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">Recent Checks</h2>
                  <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {history.length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-8">No checks yet.</p>
                  : (
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div key={h.id} className="bg-card border border-border rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{h.title || 'Untitled'}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {h.wordCount} words · {new Date(h.checkedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={cn('text-xs font-semibold shrink-0', RISK_META[h.riskLevel].color)}>
                              {RISK_META[h.riskLevel].label}
                            </span>
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            {h.checks.includes('ai') && <span>AI: <strong className="text-foreground">{h.aiScore}%</strong></span>}
                            {h.checks.includes('plagiarism') && <span>Originality: <strong className="text-foreground">{h.originalityScore}%</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
              </div>
            )}

            {/* Empty state */}
            {!result && !loading && !showHistory && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <FileSearch className="h-16 w-16 opacity-20 mb-4" />
                <p className="font-semibold text-foreground text-lg mb-1">Ready to Analyse</p>
                <p className="text-sm max-w-sm">
                  Paste text on the left, select your check type, then click Run Analysis. Highlight just a passage first to check only that part.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="font-semibold text-foreground mb-1">Analysing…</p>
                <p className="text-sm text-muted-foreground">Running deep linguistic pattern analysis</p>
              </div>
            )}

            {/* Score meters — always on top */}
            {result && !loading && (
              <div className="max-w-3xl mx-auto mb-6">
                <div className={cn('flex items-center gap-3 rounded-2xl border px-5 py-4 mb-4', risk!.bg)}>
                  {result.riskLevel === 'LOW'
                    ? <ShieldCheck className={cn('h-6 w-6 shrink-0', risk!.color)} />
                    : <AlertTriangle className={cn('h-6 w-6 shrink-0', risk!.color)} />
                  }
                  <div>
                    <p className={cn('font-bold text-base', risk!.color)}>{risk!.label}</p>
                    <p className="text-xs text-muted-foreground leading-snug">{result.wordCount} words analysed</p>
                  </div>
                </div>

                <div className={cn('grid gap-4', check === 'ai' || check === 'plagiarism' ? 'grid-cols-1' : 'grid-cols-2')}>
                  {check === 'ai' && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-violet-500" />
                          <span className="text-sm font-semibold text-foreground">AI Likelihood</span>
                        </div>
                        <span className="text-3xl font-bold text-foreground">{result.aiScore}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700',
                          result.aiScore < 30 ? 'bg-green-500' : result.aiScore < 60 ? 'bg-yellow-500' : result.aiScore < 80 ? 'bg-orange-500' : 'bg-red-500'
                        )} style={{ width: `${result.aiScore}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                        <span>Human</span><span>AI-Generated</span>
                      </div>
                    </div>
                  )}
                  {check === 'plagiarism' && (
                    <div className="bg-card border border-border rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-500" />
                          <span className="text-sm font-semibold text-foreground">Originality Score</span>
                        </div>
                        <span className="text-3xl font-bold text-foreground">{result.originalityScore}%</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700',
                          result.originalityScore > 70 ? 'bg-green-500' : result.originalityScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                        )} style={{ width: `${result.originalityScore}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                        <span>Not Original</span><span>Fully Original</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Report — same card/prose as lecture notes */}
            {result && !loading && (
              <div className="max-w-3xl mx-auto bg-card border border-border shadow-sm px-10 py-12">
                <div ref={reportRef} className={cn(
                  'prose dark:prose-invert max-w-none',
                  'prose-headings:font-bold prose-headings:text-foreground',
                  'prose-h1:text-2xl prose-h1:mb-4',
                  'prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3',
                  'prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2',
                  'prose-p:text-foreground prose-p:leading-relaxed',
                  'prose-strong:font-bold prose-strong:text-foreground',
                  'prose-blockquote:border-l-4 prose-blockquote:border-primary/40',
                  'prose-blockquote:bg-muted/40 prose-blockquote:px-4 prose-blockquote:py-3 prose-blockquote:rounded-r-lg',
                  'prose-blockquote:not-italic prose-blockquote:text-muted-foreground',
                  'prose-hr:border-border prose-hr:my-6',
                  'prose-ul:my-3 prose-li:my-1',
                )}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
