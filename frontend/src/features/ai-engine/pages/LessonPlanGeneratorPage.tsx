import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
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

interface FormState extends CommonFormState { numberOfWeeks: string; duration: string; teachingStyle: string }

export default function LessonPlanGeneratorPage() {
  const [form, setForm] = useState<FormState>({ ...COMMON_DEFAULTS, numberOfWeeks: '1', duration: '90', teachingStyle: 'Blended (lecture + discussion + activity)' })
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } = useGenerator('lesson-plan')

  function updFn(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const params: GenerationParams = {
      topic: form.topic, courseTitle: form.courseTitle || undefined, courseCode: form.courseCode || undefined,
      academicLevel: form.academicLevel, bloomLevel: form.bloomLevel || undefined,
      duration: form.duration ? Number(form.duration) : 90,
      numberOfWeeks: form.numberOfWeeks ? Number(form.numberOfWeeks) : 1,
      teachingStyle: form.teachingStyle, language: form.language,
      customInstructions: form.customInstructions || undefined,
      sourceContext: buildSourceContext(sources),
      provider: form.provider || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: updFn, disabled: isGenerating }

  return (
    <GeneratorLayout title="Lesson Plan Generator" description="Generate weekly lesson plans"
      icon={CalendarDays} isGenerating={isGenerating} isDone={isDone} error={error}
      content={content} documentId={documentId} tokensUsed={tokensUsed}
      onGenerate={handleGenerate} onCancel={cancel} onReset={reset} formValid={!!form.topic.trim()}
    >
      <TopicFields {...cfp} />

      <SourceMaterialsPanel
        sources={sources}
        onAdd={(parsed) => setSources((prev) => [...prev, ...parsed])}
        onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))}
        disabled={isGenerating}
        description="Upload a curriculum guide, course outline, or reference materials. The lesson plan will be structured around these sources."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Plan structure" />
      <AcademicLevelField {...cfp} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Number of weeks" type="number" value={form.numberOfWeeks}
          onChange={(e) => setForm((p) => ({ ...p, numberOfWeeks: e.target.value }))} disabled={isGenerating} />
        <TextField label="Session length (min)" type="number" value={form.duration}
          onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} disabled={isGenerating} />
      </div>
      <LabeledSelect label="Teaching style" value={form.teachingStyle} onChange={(v) => setForm((p) => ({ ...p, teachingStyle: v }))} disabled={isGenerating}>
        <option>Blended (lecture + discussion + activity)</option>
        <option>Lecture-based</option>
        <option>Problem-based learning</option>
        <option>Flipped classroom</option>
        <option>Case-based learning</option>
        <option>Project-based learning</option>
        <option>Inquiry-based learning</option>
        <option>Collaborative learning</option>
      </LabeledSelect>
      <BloomField {...cfp} />
      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
