import { useState } from 'react'
import { LayoutList } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { GeneratorLayout } from '../components/GeneratorLayout'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '../components/SourceMaterialsPanel'
import { ReferencesPanel } from '../components/ReferencesPanel'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField,
  LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, LabeledSelect, CheckboxField, type CommonFormState,
} from '../components/GeneratorForm'
import type { GenerationParams } from '@/lib/api/generation.api'

interface FormState extends CommonFormState {
  numberOfWeeks:    string
  creditUnits:      string
  hoursPerWeek:     string
  deliveryMode:     string
  semesterType:     string
  includeAssessment: boolean
  includeResources:  boolean
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  numberOfWeeks:     '15',
  creditUnits:       '3',
  hoursPerWeek:      '3',
  deliveryMode:      'Face-to-face',
  semesterType:      'First Semester',
  includeAssessment: true,
  includeResources:  true,
}

export default function CourseOutlineGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('course-outline')

  function updFn<K extends keyof FormState>(field: K) {
    return (val: FormState[K]) => setForm((p) => ({ ...p, [field]: val }))
  }
  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const extraParts: string[] = [
      `Credit units: ${form.creditUnits}.`,
      `Hours per week: ${form.hoursPerWeek}.`,
      `Delivery mode: ${form.deliveryMode}.`,
      `Semester type: ${form.semesterType}.`,
      `Include assessment plan: ${form.includeAssessment}.`,
      `Include recommended resources: ${form.includeResources}.`,
    ]
    if (form.customInstructions) extraParts.push(form.customInstructions)

    const params: GenerationParams = {
      topic:              form.topic,
      courseTitle:        form.courseTitle    || undefined,
      courseCode:         form.courseCode     || undefined,
      academicLevel:      form.academicLevel,
      bloomLevel:         form.bloomLevel     || undefined,
      numberOfWeeks:      form.numberOfWeeks  ? Number(form.numberOfWeeks) : 15,
      language:           form.language,
      referenceStyle:     form.referenceStyle,
      includeReferences:  form.includeReferences,
      customInstructions: extraParts.join(' '),
      sourceContext:      buildSourceContext(sources),
      provider:           form.provider       || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: set, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Course Outline Generator"
      description="Generate complete NUC-compliant course syllabi"
      icon={LayoutList}
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
        description="Upload an existing syllabus, NUC minimum academic standards document, or departmental curriculum guide. The outline will align with these materials."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Course structure" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />

      <LabeledSelect label="Delivery mode" value={form.deliveryMode} onChange={updFn('deliveryMode')} disabled={isGenerating}>
        <option>Face-to-face</option>
        <option>Online</option>
        <option>Hybrid (blended)</option>
        <option>Distance learning</option>
      </LabeledSelect>

      <LabeledSelect label="Semester" value={form.semesterType} onChange={updFn('semesterType')} disabled={isGenerating}>
        <option>First Semester</option>
        <option>Second Semester</option>
        <option>Summer / Short Semester</option>
      </LabeledSelect>

      <div className="grid grid-cols-3 gap-3">
        <TextField label="Weeks" type="number" value={form.numberOfWeeks}
          onChange={(e) => setForm((p) => ({ ...p, numberOfWeeks: e.target.value }))} disabled={isGenerating} />
        <TextField label="Credit units" type="number" value={form.creditUnits}
          onChange={(e) => setForm((p) => ({ ...p, creditUnits: e.target.value }))} disabled={isGenerating} />
        <TextField label="Hours/week" type="number" value={form.hoursPerWeek}
          onChange={(e) => setForm((p) => ({ ...p, hoursPerWeek: e.target.value }))} disabled={isGenerating} />
      </div>

      <FormSection label="Include sections" />
      <div className="space-y-2.5">
        <CheckboxField label="Assessment plan" checked={form.includeAssessment}
          onChange={(v) => setForm((p) => ({ ...p, includeAssessment: v }))} disabled={isGenerating} />
        <CheckboxField label="Recommended resources" checked={form.includeResources}
          onChange={(v) => setForm((p) => ({ ...p, includeResources: v }))} disabled={isGenerating} />
        <CheckboxField label="References list" checked={form.includeReferences}
          onChange={(v) => setForm((p) => ({ ...p, includeReferences: v }))} disabled={isGenerating} />
      </div>

      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
