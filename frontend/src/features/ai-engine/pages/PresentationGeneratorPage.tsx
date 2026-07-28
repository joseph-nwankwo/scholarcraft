import { useState } from 'react'
import { Presentation } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { GeneratorLayout } from '../components/GeneratorLayout'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '../components/SourceMaterialsPanel'
import { ReferencesPanel } from '../components/ReferencesPanel'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField,
  ContentOptionsFields, LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, LabeledSelect, CheckboxField, type CommonFormState,
} from '../components/GeneratorForm'
import type { GenerationParams } from '@/lib/api/generation.api'

interface FormState extends CommonFormState {
  numberOfSlides:    string
  duration:          string
  presentationStyle: string
  includeActivities: boolean
}

const DEFAULTS: FormState = {
  ...COMMON_DEFAULTS,
  numberOfSlides:    '15',
  duration:          '60',
  presentationStyle: 'Academic / Lecture',
  includeActivities: false,
}

export default function PresentationGeneratorPage() {
  const [form,    setForm]    = useState<FormState>(DEFAULTS)
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } =
    useGenerator('presentation')

  function updFn<K extends keyof FormState>(field: K) {
    return (val: FormState[K]) => setForm((p) => ({ ...p, [field]: val }))
  }
  function set(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const extraParts: string[] = [
      `Number of slides: ${form.numberOfSlides}.`,
      `Include engagement activities: ${form.includeActivities}.`,
    ]
    if (form.customInstructions) extraParts.push(form.customInstructions)

    const params: GenerationParams = {
      topic:             form.topic,
      courseTitle:       form.courseTitle    || undefined,
      courseCode:        form.courseCode     || undefined,
      academicLevel:     form.academicLevel,
      bloomLevel:        form.bloomLevel     || undefined,
      duration:          form.duration       ? Number(form.duration) : 60,
      // presentationStyle travels via teachingStyle so backend reads it directly
      teachingStyle:     form.presentationStyle,
      language:          form.language,
      includeExamples:   form.includeExamples,
      includeCaseStudies: form.includeCaseStudies,
      includeReferences: form.includeReferences,
      customInstructions: extraParts.join(' '),
      sourceContext:     buildSourceContext(sources),
      provider:          form.provider       || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: set, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Presentation AI"
      description="Generate slide decks with speaker notes and engagement activities"
      icon={Presentation}
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
        description="Upload lecture notes, a course outline, or reference materials. The presentation will be structured around these sources."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Slide settings" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />

      <LabeledSelect label="Presentation style" value={form.presentationStyle}
        onChange={updFn('presentationStyle')} disabled={isGenerating}>
        <option>Academic / Lecture</option>
        <option>Interactive / Workshop</option>
        <option>Research / Conference</option>
        <option>Professional / Corporate</option>
        <option>Student-facing / Engaging</option>
      </LabeledSelect>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Number of slides" type="number" value={form.numberOfSlides}
          onChange={(e) => setForm((p) => ({ ...p, numberOfSlides: e.target.value }))}
          disabled={isGenerating} />
        <TextField label="Duration (min)" type="number" value={form.duration}
          onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
          disabled={isGenerating} />
      </div>

      <FormSection label="Content options" />
      <ContentOptionsFields {...cfp} />
      <CheckboxField
        label="Include audience engagement / activities"
        checked={form.includeActivities}
        onChange={(v) => setForm((p) => ({ ...p, includeActivities: v }))}
        disabled={isGenerating}
      />

      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
