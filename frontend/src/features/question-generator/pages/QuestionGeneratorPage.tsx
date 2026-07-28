import { useState } from 'react'
import {
  HelpCircle, List, PenLine, FileText, ToggleLeft, PencilLine,
  Shuffle, BookUser, BookOpen, CheckSquare,
} from 'lucide-react'
import { useGenerator } from '@/features/ai-engine/hooks/useGenerator'
import { GeneratorLayout } from '@/features/ai-engine/components/GeneratorLayout'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '@/features/ai-engine/components/SourceMaterialsPanel'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField, DifficultyField,
  LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, CheckboxField, type CommonFormState,
} from '@/features/ai-engine/components/GeneratorForm'
import type { GenerationParams } from '@/lib/api/generation.api'
import { cn } from '@/lib/utils'

// ── Question types ─────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
  { id: 'MCQ',           label: 'Multiple Choice',   icon: List,       color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/40',     border: 'border-blue-200 dark:border-blue-800' },
  { id: 'ShortAnswer',   label: 'Short Answer',       icon: PenLine,    color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950/40',   border: 'border-green-200 dark:border-green-800' },
  { id: 'Essay',         label: 'Essay',              icon: FileText,   color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
  { id: 'TrueFalse',     label: 'True / False',       icon: ToggleLeft, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800' },
  { id: 'FillBlank',     label: 'Fill in the Blank',  icon: PencilLine, color: 'text-teal-600',   bg: 'bg-teal-50 dark:bg-teal-950/40',     border: 'border-teal-200 dark:border-teal-800' },
  { id: 'Matching',      label: 'Matching',            icon: Shuffle,    color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-950/40',     border: 'border-pink-200 dark:border-pink-800' },
  { id: 'Scenario',      label: 'Scenario-based',     icon: BookUser,   color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/40',   border: 'border-amber-200 dark:border-amber-800' },
  { id: 'Comprehension', label: 'Comprehension',       icon: BookOpen,   color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950/40',       border: 'border-red-200 dark:border-red-800' },
] as const

type QuestionTypeId = typeof QUESTION_TYPES[number]['id']

// ── Form state ─────────────────────────────────────────────────────────────────

interface FormState extends CommonFormState {
  questionTypes:       QuestionTypeId[]
  numberOfQuestions:   string
  marksPerQuestion:    string
  includeAnswers:      boolean
  includeMarkingGuide: boolean
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  questionTypes:       ['MCQ', 'ShortAnswer'],
  numberOfQuestions:   '20',
  marksPerQuestion:    '2',
  includeAnswers:      true,
  includeMarkingGuide: true,
}

// ── Question type tile selector ────────────────────────────────────────────────

function TypeSelector({
  selected, onChange, disabled,
}: {
  selected: QuestionTypeId[]
  onChange: (types: QuestionTypeId[]) => void
  disabled: boolean
}) {
  function toggle(id: QuestionTypeId) {
    if (disabled) return
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id])
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Question types <span className="normal-case text-muted-foreground/60">(select one or more)</span>
      </label>
      {selected.length === 0 && (
        <p className="text-xs text-destructive">Select at least one question type</p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        {QUESTION_TYPES.map(({ id, label, icon: Icon, color, bg, border }) => {
          const active = selected.includes(id)
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all',
                active
                  ? `${bg} ${border} font-medium`
                  : 'border-border bg-card hover:bg-muted/50 text-muted-foreground',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? color : 'text-muted-foreground')} />
              <span className={active ? 'text-foreground' : ''}>{label}</span>
              {active && <CheckSquare className={cn('h-3 w-3 ml-auto shrink-0', color)} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildQuestionSpec(form: FormState): string {
  const n    = Number(form.numberOfQuestions) || 20
  const mpq  = form.marksPerQuestion ? Number(form.marksPerQuestion) : 2
  const total = n * mpq

  const typeLabels = form.questionTypes.map(
    (id) => QUESTION_TYPES.find((t) => t.id === id)?.label ?? id,
  )

  // Distribute questions evenly across selected types
  const perType  = Math.floor(n / form.questionTypes.length)
  const remainder = n % form.questionTypes.length
  const distribution = typeLabels
    .map((label, i) => `${label}: ${perType + (i < remainder ? 1 : 0)} questions`)
    .join(', ')

  const includes: string[] = []
  if (form.includeAnswers)      includes.push('a complete answer key for every question')
  if (form.includeMarkingGuide) includes.push('a marking guide with mark allocation per question')

  return (
    `Generate exactly ${n} questions distributed as follows: ${distribution}. ` +
    `Each question is worth ${mpq} mark${mpq !== 1 ? 's' : ''} (total: ${total} marks). ` +
    (includes.length ? `Include ${includes.join(' and ')}. ` : '') +
    (form.customInstructions ? form.customInstructions : '')
  ).trim()
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function QuestionGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('question-bank')

  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    if (form.questionTypes.length === 0) return

    const params: GenerationParams = {
      topic:              form.topic,
      courseTitle:        form.courseTitle   || undefined,
      courseCode:         form.courseCode    || undefined,
      academicLevel:      form.academicLevel,
      bloomLevel:         form.bloomLevel    || undefined,
      difficulty:         form.difficulty,
      numberOfQuestions:  Number(form.numberOfQuestions) || 20,
      language:           form.language,
      customInstructions: buildQuestionSpec(form),
      sourceContext:      buildSourceContext(sources),
      provider:           form.provider      || undefined,
    }
    void generate(params)
  }

  const cfp   = { form, onChange: set, disabled: isGenerating }
  const valid = !!form.topic.trim() && form.questionTypes.length > 0

  return (
    <GeneratorLayout
      title="Question Generator Studio"
      description="Generate question banks with answer keys"
      icon={HelpCircle}
      isGenerating={isGenerating}
      isDone={isDone}
      error={error}
      content={content}
      documentId={documentId}
      tokensUsed={tokensUsed}
      onGenerate={handleGenerate}
      onCancel={cancel}
      onReset={reset}
      formValid={valid}
    >
      {/* Topic & course */}
      <TopicFields {...cfp} />

      {/* Source materials */}
      <SourceMaterialsPanel
        sources={sources}
        onAdd={(parsed) => setSources((prev) => [...prev, ...parsed])}
        onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))}
        disabled={isGenerating}
        description="Upload lecture notes, textbooks, or past papers. Questions will be drawn directly from these materials."
      />

      {/* Question types */}
      <FormSection label="Question types" />
      <TypeSelector
        selected={form.questionTypes}
        onChange={(types) => setForm((p) => ({ ...p, questionTypes: types }))}
        disabled={isGenerating}
      />

      {/* Quantity & marks */}
      <FormSection label="Question settings" />
      <AcademicLevelField {...cfp} />
      <BloomField        {...cfp} />
      <DifficultyField   {...cfp} />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Number of questions"
          type="number"
          value={form.numberOfQuestions}
          onChange={(e) => setForm((p) => ({ ...p, numberOfQuestions: e.target.value }))}
          disabled={isGenerating}
        />
        <TextField
          label="Marks per question"
          type="number"
          value={form.marksPerQuestion}
          onChange={(e) => setForm((p) => ({ ...p, marksPerQuestion: e.target.value }))}
          placeholder="e.g. 2"
          disabled={isGenerating}
        />
      </div>

      {/* Output options */}
      <FormSection label="Output options" />
      <div className="space-y-2.5">
        <CheckboxField
          label="Include answer key"
          checked={form.includeAnswers}
          onChange={(v) => setForm((p) => ({ ...p, includeAnswers: v }))}
          disabled={isGenerating}
        />
        <CheckboxField
          label="Include marking guide"
          checked={form.includeMarkingGuide}
          onChange={(v) => setForm((p) => ({ ...p, includeMarkingGuide: v }))}
          disabled={isGenerating}
        />
      </div>

      {/* Language & advanced */}
      <LanguageFields        {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField         {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
