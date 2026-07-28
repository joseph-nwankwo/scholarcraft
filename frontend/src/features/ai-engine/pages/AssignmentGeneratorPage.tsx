import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
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
  assignmentType:   string
  numberOfTasks:    string
  wordCount:        string
  totalMarks:       string
  submissionMode:   string
  groupOrIndividual: string
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  assignmentType:   'Standard (Short Answer + Essay + Research)',
  numberOfTasks:    '5',
  wordCount:        '',
  totalMarks:       '100',
  submissionMode:   'Hard copy',
  groupOrIndividual: 'Individual',
}

export default function AssignmentGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('assignment')

  function updFn<K extends keyof FormState>(field: K) {
    return (val: FormState[K]) => setForm((p) => ({ ...p, [field]: val }))
  }
  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const typeLine = `Assignment type: ${form.assignmentType}.`
    const groupLine = `Submission: ${form.groupOrIndividual} work.`
    const modeLine = `Submission method: ${form.submissionMode}.`
    const marksLine = form.totalMarks ? `Total marks: ${form.totalMarks}.` : ''
    const wcLine = form.wordCount ? `Expected word count: ${form.wordCount} words.` : ''
    const extra = [typeLine, groupLine, modeLine, marksLine, wcLine, form.customInstructions].filter(Boolean).join(' ')

    const params: GenerationParams = {
      topic:             form.topic,
      courseTitle:       form.courseTitle    || undefined,
      courseCode:        form.courseCode     || undefined,
      academicLevel:     form.academicLevel,
      bloomLevel:        form.bloomLevel     || undefined,
      difficulty:        form.difficulty,
      numberOfQuestions: form.numberOfTasks  ? Number(form.numberOfTasks) : 5,
      wordCount:         form.wordCount      ? Number(form.wordCount)     : undefined,
      language:          form.language,
      referenceStyle:    form.referenceStyle,
      includeExamples:   form.includeExamples,
      includeReferences: form.includeReferences,
      customInstructions: extra,
      sourceContext:     buildSourceContext(sources),
      provider:          form.provider       || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: set, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Assignment Generator"
      description="Generate academic assignments with marking rubrics"
      icon={ClipboardList}
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
        description="Upload course notes, textbooks, or past papers. The AI will design assignment tasks grounded in these materials."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Assignment type" />
      <LabeledSelect label="Type" value={form.assignmentType} onChange={updFn('assignmentType')} disabled={isGenerating}>
        <option>Standard (Short Answer + Essay + Research)</option>
        <option>Essay Assignment</option>
        <option>Research Report</option>
        <option>Case Study Analysis</option>
        <option>Laboratory / Practical Report</option>
        <option>Group Project</option>
        <option>Portfolio Assessment</option>
        <option>Presentation Assignment</option>
        <option>Problem-solving / Numerical</option>
        <option>Literature Review</option>
        <option>Reflective Journal</option>
        <option>Design Project</option>
      </LabeledSelect>

      <div className="grid grid-cols-2 gap-3">
        <LabeledSelect label="Submission" value={form.groupOrIndividual} onChange={updFn('groupOrIndividual')} disabled={isGenerating}>
          <option>Individual</option>
          <option>Group (2–3 students)</option>
          <option>Group (4–5 students)</option>
          <option>Pair work</option>
        </LabeledSelect>
        <LabeledSelect label="Submission method" value={form.submissionMode} onChange={updFn('submissionMode')} disabled={isGenerating}>
          <option>Hard copy</option>
          <option>Online portal</option>
          <option>Email submission</option>
          <option>Presentation (in-class)</option>
          <option>Both hard copy and online</option>
        </LabeledSelect>
      </div>

      <FormSection label="Assignment settings" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />
      <DifficultyField {...cfp} />

      <div className="grid grid-cols-3 gap-3">
        <TextField
          label="No. of tasks"
          type="number"
          value={form.numberOfTasks}
          onChange={(e) => setForm((p) => ({ ...p, numberOfTasks: e.target.value }))}
          disabled={isGenerating}
        />
        <TextField
          label="Total marks"
          type="number"
          value={form.totalMarks}
          onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
          disabled={isGenerating}
        />
        <TextField
          label="Word count"
          type="number"
          value={form.wordCount}
          onChange={(e) => setForm((p) => ({ ...p, wordCount: e.target.value }))}
          placeholder="e.g. 2000"
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
