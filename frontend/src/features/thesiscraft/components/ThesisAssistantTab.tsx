import { useState, useMemo, useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEditor, EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TiptapUnderline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TableKit, TableRow as BaseTableRow } from '@tiptap/extension-table'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ShieldCheck, Sparkles, Lightbulb, CheckCircle2, Save, Plus, Quote, BookMarked, ListTree,
  Table2, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Rows3, Columns3, Trash2,
} from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { IconButton } from '@/components/design-system/buttons/IconButton'
import { SelectField } from '@/components/design-system/inputs/SelectField'
import { StatCard } from '@/components/design-system/cards/StatCard'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { plagiarismApi, type PlagiarismResult, type PlagiarismSection, type SectionFlag } from '@/lib/api/plagiarism.api'
import { thesiscraftApi, type ThesisCitation } from '@/lib/api/thesiscraft.api'
import { formatCitation, inTextCitation, sortCitationsAlphabetically, type CitationStyle } from '../utils/citationFormat'
import type { useThesis } from '../hooks/useThesis'

type PageSize = 'LETTER' | 'A4'
type DocFont = 'times' | 'georgia' | 'cambria' | 'arial' | 'calibri'

interface DocFormat {
  pageSize: PageSize
  fontFamily: DocFont
  fontSize: number
  fontWeight: number
}

const DEFAULT_FORMAT: DocFormat = { pageSize: 'LETTER', fontFamily: 'times', fontSize: 12, fontWeight: 400 }

const PAGE_WIDTHS: Record<PageSize, string> = { LETTER: '8.5in', A4: '210mm' }

// Page heights in px at 96dpi (11in and 297mm respectively), used to size the page bands and count pages.
const PAGE_HEIGHTS_PX: Record<PageSize, number> = { LETTER: 1056, A4: 1123 }
const PAGE_GAP_PX = 32
const PAGE_MARGIN_PX = 96 // 1in top/bottom margin reserved on every page — must match the .ProseMirror padding in globals.css

/**
 * Pushes any top-level block that would otherwise straddle a page boundary down to the start of the
 * next page's content area, by setting its margin-top directly on the live DOM. Returns the resulting
 * page count. Call after every content/format change — it resets and recomputes from scratch each time.
 *
 * Takes the Editor (not just its DOM) because ProseMirror's own MutationObserver watches this DOM with
 * `attributes: true, subtree: true` — writing marginTop directly would otherwise be picked up as an
 * unexpected external edit, causing ProseMirror to reconcile/re-fire `onUpdate`, which reschedules this
 * function again, forever. Pausing the observer for the duration of our own writes (the same stop/start
 * pattern ProseMirror uses internally for its own DOM updates) avoids that feedback loop.
 */
function repaginate(editor: Editor, pageSize: PageSize): number {
  const container = editor.view.dom as HTMLElement
  const domObserver = (editor.view as unknown as { domObserver?: { stop: () => void; start: () => void } }).domObserver

  domObserver?.stop()
  try {
    const pageHeight = PAGE_HEIGHTS_PX[pageSize]
    const contentHeight = pageHeight - 2 * PAGE_MARGIN_PX
    const stride = pageHeight + PAGE_GAP_PX

    const children = Array.from(container.children) as HTMLElement[]
    children.forEach((child) => { child.style.marginTop = '' })

    let pageIndex = 0
    for (const child of children) {
      const zoneStart = PAGE_MARGIN_PX + pageIndex * stride
      const zoneEnd = zoneStart + contentHeight
      const top = child.offsetTop
      const height = child.offsetHeight

      if (top > zoneStart && top + height > zoneEnd) {
        const currentMargin = parseFloat(getComputedStyle(child).marginTop) || 0
        const naturalTopWithoutMargin = top - currentMargin
        child.style.marginTop = `${zoneStart + stride - naturalTopWithoutMargin}px`
        pageIndex += 1
      }
    }
    return pageIndex + 1
  } finally {
    domObserver?.start()
  }
}

const FONT_STACKS: Record<DocFont, string> = {
  times: "'Times New Roman', Times, serif",
  georgia: "Georgia, 'Times New Roman', serif",
  cambria: "Cambria, Georgia, serif",
  arial: "Arial, Helvetica, sans-serif",
  calibri: "Calibri, 'Segoe UI', sans-serif",
}

const FONT_OPTIONS: { value: DocFont; label: string }[] = [
  { value: 'times', label: 'Times New Roman' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'cambria', label: 'Cambria' },
  { value: 'arial', label: 'Arial' },
  { value: 'calibri', label: 'Calibri' },
]

const FONT_SIZE_OPTIONS = [10, 11, 12, 13, 14, 16, 18].map((pt) => ({ value: String(pt), label: `${pt} pt` }))

const FONT_WEIGHT_OPTIONS = [
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
]

function formatStorageKey(thesisId: string) {
  return `thesiscraft:assistant-format:${thesisId}`
}

const TABLE_GRID_SIZE = 8

const ROW_HEIGHT_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: '32', label: 'Short' },
  { value: '48', label: 'Medium' },
  { value: '64', label: 'Tall' },
  { value: '96', label: 'Extra tall' },
]

/** TableRow extended with a resizable row height, stored as inline style so it round-trips through HTML. */
const TableRow = BaseTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const height = element.style.height
          return height ? parseInt(height, 10) : null
        },
        renderHTML: (attributes: { height?: number | null }) => {
          if (!attributes.height) return {}
          return { style: `height: ${attributes.height}px` }
        },
      },
    }
  },
})

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Renders markdown (from a chapter or the proposal) to HTML so it can be inserted into the rich-text editor. */
function markdownToHtml(markdown: string): string {
  return renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>)
}

/** Finds a heading with the given exact text, plus the content block immediately following it (if any). */
function findHeadingRange(editor: Editor, headingText: string): { from: number; to: number } | null {
  let range: { from: number; to: number } | null = null
  editor.state.doc.descendants((node, pos) => {
    if (range) return false
    if (node.type.name === 'heading' && node.textContent.trim() === headingText) {
      const from = pos
      const headingEnd = pos + node.nodeSize
      const nextNode = editor.state.doc.resolve(headingEnd).nodeAfter
      const to = nextNode && nextNode.type.name !== 'heading' ? headingEnd + nextNode.nodeSize : headingEnd
      range = { from, to }
      return false
    }
    return true
  })
  return range
}

function docHasHeading(editor: Editor, headingText: string): boolean {
  return findHeadingRange(editor, headingText) !== null
}

/** Replaces an existing heading block (heading + following content) in place, or appends a new one. */
function upsertHeadingBlock(editor: Editor, headingText: string, html: string) {
  const range = findHeadingRange(editor, headingText)
  if (range) {
    editor.chain().focus().deleteRange(range).insertContentAt(range.from, html).run()
  } else {
    editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run()
  }
}

const RISK_META: Record<PlagiarismResult['riskLevel'], { label: string; variant: 'success' | 'warning' | 'error' }> = {
  LOW:       { label: 'Low Risk',       variant: 'success' },
  MEDIUM:    { label: 'Medium Risk',    variant: 'warning' },
  HIGH:      { label: 'High Risk',      variant: 'error' },
  VERY_HIGH: { label: 'Very High Risk', variant: 'error' },
}

const TIPS = [
  'Paraphrase in your own words after reading a source — don\'t lightly edit an AI draft.',
  'Cite every statistic, direct claim, or idea that isn\'t originally yours.',
  'Add your own critical analysis, examples, or disagreement — don\'t just summarise sources.',
  'Vary your sentence length naturally; AI text tends to be uniformly medium-length.',
  'Read your draft aloud — if it doesn\'t sound like you, rewrite it in your own voice.',
  'Check early and often, not just before submission.',
]

interface Span { text: string; flag: SectionFlag | null; reason?: string }

function buildSpans(text: string, sections: PlagiarismSection[]): Span[] {
  const flagged = sections.filter((s) => s.flag !== 'clean')
  const marks: Array<{ start: number; end: number; flag: SectionFlag; reason: string }> = []

  for (const sec of flagged) {
    const needle = sec.text.slice(0, 60).toLowerCase()
    const idx = text.toLowerCase().indexOf(needle)
    if (idx !== -1) marks.push({ start: idx, end: idx + sec.text.length, flag: sec.flag, reason: sec.reason })
  }

  if (marks.length === 0) return [{ text, flag: null }]
  marks.sort((a, b) => a.start - b.start)

  const spans: Span[] = []
  let pos = 0
  for (const m of marks) {
    if (m.start < pos) continue
    if (m.start > pos) spans.push({ text: text.slice(pos, m.start), flag: null })
    spans.push({ text: text.slice(m.start, m.end), flag: m.flag, reason: m.reason })
    pos = m.end
  }
  if (pos < text.length) spans.push({ text: text.slice(pos), flag: null })
  return spans
}

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function ThesisAssistantTab({ thesisState }: Props) {
  const { thesis, saveAssistantDocument } = thesisState

  const [draft, setDraft]     = useState(thesis?.assistantDocument ?? '')
  const [savedText, setSavedText] = useState(thesis?.assistantDocument ?? '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [importKey, setImportKey] = useState('')
  const [format, setFormat] = useState<DocFormat>(DEFAULT_FORMAT)

  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA')
  const [citationPickerOpen, setCitationPickerOpen] = useState(false)
  const [tablePickerOpen, setTablePickerOpen] = useState(false)
  const [tableHover, setTableHover] = useState({ rows: 0, cols: 0 })

  const [checking, setChecking] = useState(false)
  const [error, setError]       = useState('')
  const [result, setResult]     = useState<PlagiarismResult | null>(null)
  const [checkedText, setCheckedText] = useState('')

  const [pageCount, setPageCount] = useState(1)
  const docRef = useRef<HTMLDivElement>(null)
  const repaginateFrame = useRef<number | null>(null)

  function scheduleRepaginate() {
    if (repaginateFrame.current) cancelAnimationFrame(repaginateFrame.current)
    repaginateFrame.current = requestAnimationFrame(() => {
      if (!editor) return
      setPageCount(repaginate(editor, format.pageSize))
    })
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TableKit.configure({ table: { resizable: true }, tableRow: false }),
      TableRow,
      Placeholder.configure({ placeholder: 'Start typing your thesis, or paste content from elsewhere…' }),
    ],
    content: '',
    immediatelyRender: true,
    onUpdate: ({ editor }) => {
      setDraft(editor.getHTML())
      scheduleRepaginate()
    },
  })

  // Sync editor content when a different thesis loads.
  useEffect(() => {
    if (!editor) return
    const html = thesis?.assistantDocument ?? ''
    editor.commands.setContent(html, { emitUpdate: false })
    setDraft(html)
    setSavedText(html)
    setResult(null)
    scheduleRepaginate()
  }, [thesis?.id, editor])

  // Page size and font changes affect layout height, so recompute page breaks whenever they change.
  useEffect(() => {
    scheduleRepaginate()
  }, [format.pageSize, format.fontFamily, format.fontSize, format.fontWeight])

  // Viewport resizes can reflow line-wrapping and shift block heights.
  useEffect(() => {
    window.addEventListener('resize', scheduleRepaginate)
    return () => window.removeEventListener('resize', scheduleRepaginate)
  }, [])

  // Page/font formatting is a per-thesis preference, remembered locally.
  useEffect(() => {
    if (!thesis) return
    try {
      const raw = localStorage.getItem(formatStorageKey(thesis.id))
      setFormat(raw ? { ...DEFAULT_FORMAT, ...JSON.parse(raw) } : DEFAULT_FORMAT)
    } catch {
      setFormat(DEFAULT_FORMAT)
    }
  }, [thesis?.id])

  function updateFormat(patch: Partial<DocFormat>) {
    setFormat((prev) => {
      const next = { ...prev, ...patch }
      if (thesis) {
        try {
          localStorage.setItem(formatStorageKey(thesis.id), JSON.stringify(next))
        } catch {
          // ignore quota/private-browsing write failures
        }
      }
      return next
    })
  }

  const importSources = useMemo(() => {
    if (!thesis) return []
    const opts: { key: string; label: string; text: string }[] = []

    const proposalText = Object.values(thesis.proposalSections).filter((v) => v?.trim()).join('\n\n')
    if (proposalText.trim()) opts.push({ key: 'proposal', label: 'Full Proposal', text: proposalText })

    for (const chapter of thesis.chapters) {
      if (chapter.content?.trim()) opts.push({ key: `chapter:${chapter.id}`, label: chapter.title, text: chapter.content })
    }
    return opts
  }, [thesis])

  if (!thesis) return null

  const plainText = editor?.getText({ blockSeparator: '\n\n' }) ?? ''
  const isDirty = draft !== savedText
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0
  const hasToc = editor ? docHasHeading(editor, 'Table of Contents') : false
  const hasBibliography = editor ? docHasHeading(editor, 'References') : false

  async function handleSave() {
    setSaving(true)
    try {
      await saveAssistantDocument(draft)
      setSavedText(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function handleImport() {
    const source = importSources.find((s) => s.key === importKey)
    if (!source || !editor) return
    editor.chain().focus().insertContentAt(editor.state.doc.content.size, markdownToHtml(source.text)).run()
    setImportKey('')
  }

  function handleItalic() {
    editor?.chain().focus().toggleItalic().run()
  }

  function handleUnderline() {
    editor?.chain().focus().toggleUnderline().run()
  }

  function handleAlign(alignment: 'left' | 'center' | 'right' | 'justify') {
    editor?.chain().focus().setTextAlign(alignment).run()
  }

  function handleInsertTable(rows: number, cols: number) {
    if (editor) {
      // Collapse any active selection first so inserting a table can't silently delete selected text.
      const { to } = editor.state.selection
      editor.chain().focus().setTextSelection(to).insertTable({ rows, cols, withHeaderRow: true }).run()
    }
    setTablePickerOpen(false)
    setTableHover({ rows: 0, cols: 0 })
  }

  function handleSetRowHeight(value: string) {
    editor?.chain().focus().updateAttributes('tableRow', { height: value ? Number(value) : null }).run()
  }

  function handleInsertCitation(citation: ThesisCitation) {
    if (editor) {
      const { to } = editor.state.selection
      editor.chain().focus().setTextSelection(to).insertContent(`${inTextCitation(citation, citationStyle)} `).run()
    }
    setCitationPickerOpen(false)
  }

  function handleInsertBibliography() {
    if (!thesis || !editor) return
    const sorted = sortCitationsAlphabetically(thesis.citations)
    const items = sorted.map((c) => `<p>${escapeHtml(formatCitation(c, citationStyle))}</p>`).join('')
    upsertHeadingBlock(editor, 'References', `<h2>References</h2>${items}`)
  }

  function handleInsertToc() {
    if (!editor) return
    const headings: { level: number; text: string }[] = []
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'heading' && node.attrs.level <= 3 && node.textContent.trim() !== 'Table of Contents') {
        headings.push({ level: node.attrs.level, text: node.textContent.trim() })
      }
    })
    const items = headings.length > 0
      ? headings.map((h) => `<li style="margin-left:${(h.level - 1) * 1.25}rem">${escapeHtml(h.text)}</li>`).join('')
      : '<li><em>No headings yet — type "# ", "## ", or "### " to start a heading and it will appear here.</em></li>'
    upsertHeadingBlock(editor, 'Table of Contents', `<h2>Table of Contents</h2><ul>${items}</ul>`)
  }

  async function handleCheck() {
    const text = plainText
    if (!text.trim()) return
    setError('')
    setChecking(true)
    try {
      const data = await plagiarismApi.check({
        text,
        title: `${thesis!.title} — Thesis Assistant Workspace`,
        checks: ['ai', 'plagiarism'],
      })
      setResult(data)
      setCheckedText(text)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Could not run the check. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  const spans = result ? buildSpans(checkedText, result.sections) : []
  const flaggedSections = result?.sections.filter((s) => s.flag !== 'clean') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Thesis Assistant</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Write or paste your thesis here, save your work, and check it for AI-detection and originality signals.
        </p>
      </div>

      {error && <Alert variant="warning" description={error} />}

      {/* Toolbar */}
      <div className="rounded-xl border bg-card p-4 shadow-card flex flex-col sm:flex-row sm:items-end gap-3">
        {importSources.length > 0 && (
          <div className="flex-1">
            <SelectField
              label="Import from Thesis Template"
              value={importKey}
              onValueChange={setImportKey}
              placeholder="Choose a chapter or the proposal…"
              options={importSources.map((s) => ({ value: s.key, label: s.label }))}
            />
          </div>
        )}
        {importSources.length > 0 && (
          <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />} disabled={!importKey} onClick={handleImport}>
            Insert
          </Button>
        )}
        <div className="flex-1 hidden sm:block" />
        <span className="text-xs text-muted-foreground shrink-0 self-center">
          {wordCount.toLocaleString()} word{wordCount !== 1 ? 's' : ''}{isDirty && ' · Unsaved changes'}
        </span>
        <Button variant={saved ? 'success' : 'outline'} loading={saving} disabled={!isDirty && !saved} leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
          {saved ? 'Saved!' : 'Save'}
        </Button>
        <Button loading={checking} disabled={!plainText.trim()} leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={handleCheck}>
          Run Check
        </Button>
      </div>

      {/* Reference tools — insert citations, bibliography, and a table of contents like Word's References ribbon */}
      <div className="rounded-xl border bg-card p-4 shadow-card flex flex-wrap items-end gap-3">
        <div className="w-36">
          <SelectField
            label="Citation Style"
            value={citationStyle}
            onValueChange={(v) => setCitationStyle(v as CitationStyle)}
            options={[
              { value: 'APA', label: 'APA' },
              { value: 'MLA', label: 'MLA' },
              { value: 'Harvard', label: 'Harvard' },
            ]}
          />
        </div>

        <Popover open={citationPickerOpen} onOpenChange={setCitationPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" leftIcon={<Quote className="h-4 w-4" />} disabled={thesis.citations.length === 0}>
              Insert Citation
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="border-b px-3 py-2.5">
              <p className="text-xs font-semibold text-foreground">Insert an in-text citation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Inserted at your cursor, in {citationStyle} style.</p>
            </div>
            <div className="max-h-72 overflow-y-auto p-1">
              {thesis.citations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleInsertCitation(c)}
                  className="w-full text-left rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                >
                  <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.authors} {c.year && `(${c.year})`}</p>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          leftIcon={<BookMarked className="h-4 w-4" />}
          disabled={thesis.citations.length === 0}
          onClick={handleInsertBibliography}
        >
          {hasBibliography ? 'Update Bibliography' : 'Insert Bibliography'}
        </Button>

        <Button variant="outline" leftIcon={<ListTree className="h-4 w-4" />} onClick={handleInsertToc}>
          {hasToc ? 'Update Table of Contents' : 'Insert Table of Contents'}
        </Button>

        <span className="text-xs text-muted-foreground self-center">
          Type <code className="px-1 rounded bg-muted">#</code>, <code className="px-1 rounded bg-muted">##</code> at the start of a line for headings to structure chapters for the table of contents.
        </span>
      </div>

      {/* Page & font formatting — mirrors Word's Home/Layout ribbon */}
      <div className="rounded-xl border bg-card p-4 shadow-card flex flex-wrap items-end gap-3">
        <div className="w-32">
          <SelectField
            label="Page Size"
            value={format.pageSize}
            onValueChange={(v) => updateFormat({ pageSize: v as PageSize })}
            options={[
              { value: 'LETTER', label: 'US Letter' },
              { value: 'A4', label: 'A4' },
            ]}
          />
        </div>
        <div className="w-44">
          <SelectField
            label="Font"
            value={format.fontFamily}
            onValueChange={(v) => updateFormat({ fontFamily: v as DocFont })}
            options={FONT_OPTIONS}
          />
        </div>
        <div className="w-28">
          <SelectField
            label="Font Size"
            value={String(format.fontSize)}
            onValueChange={(v) => updateFormat({ fontSize: Number(v) })}
            options={FONT_SIZE_OPTIONS}
          />
        </div>
        <div className="w-32">
          <SelectField
            label="Font Weight"
            value={String(format.fontWeight)}
            onValueChange={(v) => updateFormat({ fontWeight: Number(v) })}
            options={FONT_WEIGHT_OPTIONS}
          />
        </div>
      </div>

      {/* Insert & format — Table, italics, underline, and paragraph alignment */}
      <div className="rounded-xl border bg-card p-4 shadow-card flex flex-wrap items-center gap-3">
        <Popover
          open={tablePickerOpen}
          onOpenChange={(open) => {
            setTablePickerOpen(open)
            if (!open) setTableHover({ rows: 0, cols: 0 })
          }}
        >
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" leftIcon={<Table2 className="h-3.5 w-3.5" />}>
              Insert Table
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            <p className="text-xs font-semibold text-foreground mb-2 text-center">
              {tableHover.rows > 0 ? `${tableHover.cols} × ${tableHover.rows} Table` : 'Insert Table'}
            </p>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${TABLE_GRID_SIZE}, minmax(0, 1fr))` }}
              onMouseLeave={() => setTableHover({ rows: 0, cols: 0 })}
            >
              {Array.from({ length: TABLE_GRID_SIZE * TABLE_GRID_SIZE }).map((_, i) => {
                const row = Math.floor(i / TABLE_GRID_SIZE) + 1
                const col = (i % TABLE_GRID_SIZE) + 1
                const active = row <= tableHover.rows && col <= tableHover.cols
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${col} by ${row} table`}
                    onMouseEnter={() => setTableHover({ rows: row, cols: col })}
                    onClick={() => handleInsertTable(row, col)}
                    className={cn(
                      'h-4 w-4 rounded-xs border transition-colors',
                      active ? 'bg-primary border-primary' : 'bg-muted border-border'
                    )}
                  />
                )
              })}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border" />

        <IconButton
          icon={<Italic className="h-4 w-4" />}
          tooltip="Italics"
          variant="outline"
          size="md"
          className={cn(editor?.isActive('italic') && 'bg-primary/15 text-primary border-primary/40')}
          onClick={handleItalic}
        />
        <IconButton
          icon={<Underline className="h-4 w-4" />}
          tooltip="Underline"
          variant="outline"
          size="md"
          className={cn(editor?.isActive('underline') && 'bg-primary/15 text-primary border-primary/40')}
          onClick={handleUnderline}
        />

        <div className="w-px h-6 bg-border" />

        <IconButton
          icon={<AlignLeft className="h-4 w-4" />}
          tooltip="Align left"
          variant="outline"
          size="md"
          className={cn(editor?.isActive({ textAlign: 'left' }) && 'bg-primary/15 text-primary border-primary/40')}
          onClick={() => handleAlign('left')}
        />
        <IconButton
          icon={<AlignCenter className="h-4 w-4" />}
          tooltip="Align center"
          variant="outline"
          size="md"
          className={cn(editor?.isActive({ textAlign: 'center' }) && 'bg-primary/15 text-primary border-primary/40')}
          onClick={() => handleAlign('center')}
        />
        <IconButton
          icon={<AlignRight className="h-4 w-4" />}
          tooltip="Align right"
          variant="outline"
          size="md"
          className={cn(editor?.isActive({ textAlign: 'right' }) && 'bg-primary/15 text-primary border-primary/40')}
          onClick={() => handleAlign('right')}
        />
        <IconButton
          icon={<AlignJustify className="h-4 w-4" />}
          tooltip="Justify"
          variant="outline"
          size="md"
          className={cn(editor?.isActive({ textAlign: 'justify' }) && 'bg-primary/15 text-primary border-primary/40')}
          onClick={() => handleAlign('justify')}
        />

        <span className="text-xs text-muted-foreground ml-auto">
          Select text to format it, or place your cursor and click a button.
        </span>
      </div>

      {/* Table tools — only shown while the cursor is inside a table, like Word's contextual Table Layout ribbon */}
      {editor?.isActive('table') && (
        <div className="rounded-xl border bg-card p-4 shadow-card flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Table:</span>

          <Button variant="outline" size="sm" leftIcon={<Rows3 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().addRowBefore().run()}>
            Row Above
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Rows3 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().addRowAfter().run()}>
            Row Below
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().deleteRow().run()}>
            Delete Row
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button variant="outline" size="sm" leftIcon={<Columns3 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().addColumnBefore().run()}>
            Col Left
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Columns3 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().addColumnAfter().run()}>
            Col Right
          </Button>
          <Button variant="outline" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => editor.chain().focus().deleteColumn().run()}>
            Delete Column
          </Button>

          <div className="w-px h-6 bg-border" />

          <div className="w-32">
            <SelectField
              label="Row Height"
              size="sm"
              value={String(editor.getAttributes('tableRow').height ?? '')}
              onValueChange={handleSetRowHeight}
              options={ROW_HEIGHT_OPTIONS}
            />
          </div>

          <Button variant="danger" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} className="ml-auto" onClick={() => editor.chain().focus().deleteTable().run()}>
            Delete Table
          </Button>
        </div>
      )}

      {/* Word-page-style workspace — a continuous editor overlaid on page-sized bands so it reads as separate pages */}
      <div className="rounded-xl bg-muted/40 p-4 sm:p-10 flex justify-center">
        <div className="relative w-full" style={{ maxWidth: PAGE_WIDTHS[format.pageSize] }}>
          <div className="absolute inset-x-0 top-0" aria-hidden>
            {Array.from({ length: pageCount }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 rounded-sm border border-border bg-card shadow-hover"
                style={{ top: i * (PAGE_HEIGHTS_PX[format.pageSize] + PAGE_GAP_PX), height: PAGE_HEIGHTS_PX[format.pageSize] }}
              >
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                  Page {i + 1} of {pageCount}
                </span>
              </div>
            ))}
          </div>

          <div
            ref={docRef}
            className="tiptap-doc relative px-10 sm:px-16"
            style={{
              ['--doc-font-family' as string]: FONT_STACKS[format.fontFamily],
              ['--doc-font-size' as string]: `${format.fontSize}pt`,
              ['--doc-font-weight' as string]: String(format.fontWeight),
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="AI-Detection Score" value={`${result.aiScore}%`} color={result.aiScore >= 60 ? 'error' : result.aiScore >= 30 ? 'warning' : 'success'} />
            <StatCard label="Originality Score" value={`${result.originalityScore}%`} color={result.originalityScore < 55 ? 'error' : result.originalityScore < 80 ? 'warning' : 'success'} />
            <div className="rounded-xl border bg-card p-5 shadow-card flex flex-col justify-center items-start gap-2">
              <span className="text-xs font-medium text-muted-foreground">Risk Level</span>
              <Badge variant={RISK_META[result.riskLevel].variant}>{RISK_META[result.riskLevel].label}</Badge>
            </div>
          </div>

          <Alert variant="info" title="Summary" description={result.summary} />

          {flaggedSections.length === 0 ? (
            <Alert variant="success" title="No flagged passages" description="This text reads as original and human-authored. Nice work." />
          ) : (
            <>
              <div className="rounded-xl border bg-card p-5 shadow-card">
                <h3 className="font-semibold text-foreground mb-3">Highlighted Text</h3>
                <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-foreground p-3 border border-input rounded-lg bg-background max-h-96 overflow-y-auto">
                  {spans.map((span, i) => !span.flag ? (
                    <span key={i}>{span.text}</span>
                  ) : (
                    <mark
                      key={i}
                      title={span.reason}
                      className={cn(
                        'rounded-sm px-0.5 not-italic',
                        span.flag === 'ai_likely'
                          ? 'bg-violet-200/80 border-b-2 border-violet-500 dark:bg-violet-800/50 dark:border-violet-400'
                          : 'bg-orange-200/80 border-b-2 border-orange-500 dark:bg-orange-800/50 dark:border-orange-400'
                      )}
                    >
                      {span.text}
                    </mark>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Flagged Passages — Coaching</h3>
                {flaggedSections.map((section, i) => (
                  <CoachingCard key={i} section={section} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 shadow-card">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" /> Tips for Genuine Originality
        </h3>
        <ul className="space-y-2">
          {TIPS.map((tip) => (
            <li key={tip} className="text-sm text-muted-foreground flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CoachingCard({ section }: { section: PlagiarismSection }) {
  const [guidance, setGuidance] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleGetGuidance() {
    setError('')
    setLoading(true)
    try {
      const result = await thesiscraftApi.getOriginalityCoaching(section.text, section.reason, section.flag as 'ai_likely' | 'suspicious')
      setGuidance(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Could not get guidance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant={section.flag === 'ai_likely' ? 'error' : 'warning'} size="sm">
            {section.flag === 'ai_likely' ? 'AI-Likely' : 'Suspicious'}
          </Badge>
          <p className="text-sm text-foreground mt-2 italic">&ldquo;{section.text}&rdquo;</p>
          <p className="text-xs text-muted-foreground mt-1">{section.reason}</p>
        </div>
      </div>

      {error && <Alert variant="warning" description={error} />}

      {guidance ? (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <p className="text-xs whitespace-pre-line text-foreground">{guidance}</p>
        </div>
      ) : (
        <Button variant="outline" size="sm" loading={loading} leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={handleGetGuidance}>
          Get Writing Guidance
        </Button>
      )}
    </div>
  )
}
