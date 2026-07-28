import { useState } from 'react'
import { CheckSquare } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { GeneratorLayout } from '../components/GeneratorLayout'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '../components/SourceMaterialsPanel'
import { ReferencesPanel } from '../components/ReferencesPanel'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField,
  LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, LabeledSelect, type CommonFormState,
} from '../components/GeneratorForm'
import type { GenerationParams } from '@/lib/api/generation.api'

interface FormState extends CommonFormState {
  assessmentType:  string
  markingType:     string
  totalMarks:      string
  numberOfTasks:   string
  passMark:        string
  gradingSystem:   string
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  assessmentType:  'Examination',
  markingType:     'Analytic rubric (multiple criteria)',
  totalMarks:      '100',
  numberOfTasks:   '',
  passMark:        '40',
  gradingSystem:   'Nigerian university (A 70–100 / B 60–69 / C 50–59 / F <40)',
}

export default function MarkingSchemeGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('marking-scheme')

  function updFn<K extends keyof FormState>(field: K) {
    return (val: FormState[K]) => setForm((p) => ({ ...p, [field]: val }))
  }
  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const extraParts: string[] = [
      `Assessment type: ${form.assessmentType}.`,
      `Marking scheme type: ${form.markingType}.`,
      `Total marks: ${form.totalMarks}.`,
      `Pass mark: ${form.passMark}%.`,
      `Grading system: ${form.gradingSystem}.`,
    ]
    if (form.numberOfTasks) extraParts.push(`Number of questions/tasks: ${form.numberOfTasks}.`)
    if (form.customInstructions) extraParts.push(form.customInstructions)

    const params: GenerationParams = {
      topic:             form.topic,
      courseTitle:       form.courseTitle    || undefined,
      courseCode:        form.courseCode     || undefined,
      academicLevel:     form.academicLevel,
      bloomLevel:        form.bloomLevel     || undefined,
      language:          form.language,
      teachingStyle:     form.markingType,
      customInstructions: extraParts.join(' '),
      sourceContext:     buildSourceContext(sources),
      provider:          form.provider       || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: set, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Rubric Generator"
      description="Generate detailed marking schemes and assessment rubrics"
      icon={CheckSquare}
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
        description="Upload the assessment questions, assignment brief, or task description. The rubric will be tailored to these materials."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Assessment details" />
      <LabeledSelect label="What is being marked?" value={form.assessmentType} onChange={updFn('assessmentType')} disabled={isGenerating}>
        <option>Examination</option>
        <option>Assignment</option>
        <option>Essay</option>
        <option>Research Report</option>
        <option>Case Study</option>
        <option>Laboratory / Practical Report</option>
        <option>Group Project</option>
        <option>Presentation</option>
        <option>Portfolio</option>
        <option>Dissertation / Thesis</option>
        <option>Oral Examination (Viva)</option>
        <option>Problem-solving / Numerical</option>
      </LabeledSelect>

      <LabeledSelect label="Rubric type" value={form.markingType} onChange={updFn('markingType')} disabled={isGenerating}>
        <option>Analytic rubric (multiple criteria)</option>
        <option>Holistic rubric (overall performance bands)</option>
        <option>Detailed per-question marking guide</option>
        <option>Point-based scheme with model answers</option>
        <option>Single-point rubric (pass/fail criteria)</option>
        <option>Developmental rubric (growth over time)</option>
      </LabeledSelect>

      <LabeledSelect label="Grading system" value={form.gradingSystem} onChange={updFn('gradingSystem')} disabled={isGenerating}>
        <option>Nigerian university (A 70–100 / B 60–69 / C 50–59 / F &lt;40)</option>
        <option>Standard percentage (A 90–100 / B 80–89 / C 70–79 / D 60–69 / F &lt;60)</option>
        <option>CGPA 5.0 scale</option>
        <option>CGPA 4.0 scale</option>
        <option>UK Honours (First / 2:1 / 2:2 / Third / Fail)</option>
        <option>Pass / Merit / Distinction</option>
        <option>Competency-based (Competent / Not Yet Competent)</option>
      </LabeledSelect>

      <FormSection label="Mark allocation" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />

      <div className="grid grid-cols-3 gap-3">
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
        <TextField
          label="No. of questions"
          type="number"
          value={form.numberOfTasks}
          onChange={(e) => setForm((p) => ({ ...p, numberOfTasks: e.target.value }))}
          placeholder="Optional"
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
