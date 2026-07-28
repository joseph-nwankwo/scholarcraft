import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { GeneratorLayout } from '../components/GeneratorLayout'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '../components/SourceMaterialsPanel'
import { ReferencesPanel } from '../components/ReferencesPanel'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField, DifficultyField,
  LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, LabeledSelect, type CommonFormState,
} from '../components/GeneratorForm'
import type { GenerationParams } from '@/lib/api/generation.api'

interface FormState extends CommonFormState {
  examType:        string
  numberOfQuestions: string
  duration:        string
  totalMarks:      string
  passMark:        string
  sectionWeight:   string
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  examType:          'End-of-semester examination',
  numberOfQuestions: '30',
  duration:          '180',
  totalMarks:        '100',
  passMark:          '40',
  sectionWeight:     'Section A: 40% Objective · Section B: 60% Theory',
}

export default function ExamGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('exam')

  function updFn<K extends keyof FormState>(field: K) {
    return (val: FormState[K]) => setForm((p) => ({ ...p, [field]: val }))
  }
  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const extraParts: string[] = []
    if (form.totalMarks)    extraParts.push(`Total marks: ${form.totalMarks}.`)
    if (form.passMark)      extraParts.push(`Pass mark: ${form.passMark}%.`)
    if (form.sectionWeight) extraParts.push(`Section weighting: ${form.sectionWeight}.`)
    if (form.customInstructions) extraParts.push(form.customInstructions)

    const params: GenerationParams = {
      topic:             form.topic,
      courseTitle:       form.courseTitle    || undefined,
      courseCode:        form.courseCode     || undefined,
      academicLevel:     form.academicLevel,
      bloomLevel:        form.bloomLevel     || undefined,
      difficulty:        form.difficulty,
      numberOfQuestions: form.numberOfQuestions ? Number(form.numberOfQuestions) : 30,
      duration:          form.duration          ? Number(form.duration)          : 180,
      teachingStyle:     form.examType,
      language:          form.language,
      customInstructions: extraParts.join(' ') || undefined,
      sourceContext:     buildSourceContext(sources),
      provider:          form.provider          || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: set, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Exam Builder"
      description="Generate full examination papers with marking schemes"
      icon={GraduationCap}
      isGenerating={isGenerating}
      isDone={isDone}
      error={error}
      content={content}
      documentId={documentId}
      tokensUsed={tokensUsed}
      onGenerate={handleGenerate}
      onCancel={cancel}
      onReset={reset}
      formValid={!!form.topic.trim()}
    >
      <TopicFields {...cfp} />

      <SourceMaterialsPanel
        sources={sources}
        onAdd={(parsed) => setSources((prev) => [...prev, ...parsed])}
        onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))}
        disabled={isGenerating}
        description="Upload course materials, past papers, or lecture notes. Exam questions will be drawn from these sources."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Exam type" />
      <LabeledSelect label="Type" value={form.examType} onChange={updFn('examType')} disabled={isGenerating}>
        <option>End-of-semester examination</option>
        <option>Mid-semester examination</option>
        <option>Continuous Assessment Test (CAT)</option>
        <option>Mock / Practice examination</option>
        <option>Professional certification exam</option>
        <option>Entrance examination</option>
        <option>Supplementary / Resit examination</option>
      </LabeledSelect>

      <LabeledSelect label="Section weighting" value={form.sectionWeight} onChange={updFn('sectionWeight')} disabled={isGenerating}>
        <option>Section A: 40% Objective · Section B: 60% Theory</option>
        <option>Section A: 30% Objective · Section B: 70% Theory</option>
        <option>Section A: 50% Objective · Section B: 50% Theory</option>
        <option>Objective questions only (100%)</option>
        <option>Theory / Essay questions only (100%)</option>
        <option>Section A: MCQ · Section B: Short Answer · Section C: Essay</option>
      </LabeledSelect>

      <FormSection label="Exam settings" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />
      <DifficultyField {...cfp} />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="No. of questions"
          type="number"
          value={form.numberOfQuestions}
          onChange={(e) => setForm((p) => ({ ...p, numberOfQuestions: e.target.value }))}
          disabled={isGenerating}
        />
        <TextField
          label="Duration (min)"
          type="number"
          value={form.duration}
          onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
          disabled={isGenerating}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Total marks"
          type="number"
          value={form.totalMarks}
          onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
          disabled={isGenerating}
        />
        <TextField
          label="Pass mark (%)"
          type="number"
          value={form.passMark}
          onChange={(e) => setForm((p) => ({ ...p, passMark: e.target.value }))}
          disabled={isGenerating}
        />
      </div>

      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
