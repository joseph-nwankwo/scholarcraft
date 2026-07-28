import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useGenerator } from '../hooks/useGenerator'
import { GeneratorLayout } from '../components/GeneratorLayout'
import { TextField } from '@/components/design-system/inputs/TextField'
import {
  COMMON_DEFAULTS, TopicFields, AcademicLevelField, BloomField,
  ContentOptionsFields, LanguageFields, ProviderField, CustomInstructionsField,
  FormSection, type CommonFormState,
} from '../components/GeneratorForm'
import { SourceMaterialsPanel, buildSourceContext, type UploadedSource } from '../components/SourceMaterialsPanel'
import { ReferencesPanel } from '../components/ReferencesPanel'
import type { GenerationParams } from '@/lib/api/generation.api'

interface FormState extends CommonFormState { wordCount: string; duration: string }

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LectureNotesGeneratorPage() {
  const [form,    setForm]    = useState<FormState>({ ...COMMON_DEFAULTS, wordCount: '', duration: '90' })
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } = useGenerator('lecture-notes')

  function updFn(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const sourceContext = buildSourceContext(sources)

    const params: GenerationParams = {
      topic:              form.topic,
      courseTitle:        form.courseTitle || undefined,
      courseCode:         form.courseCode  || undefined,
      academicLevel:      form.academicLevel,
      bloomLevel:         form.bloomLevel  || undefined,
      wordCount:          form.wordCount   ? Number(form.wordCount) : undefined,
      duration:           form.duration    ? Number(form.duration)  : 90,
      language:           form.language,
      referenceStyle:     form.referenceStyle,
      tone:               form.tone,
      includeExamples:    form.includeExamples,
      includeCaseStudies: form.includeCaseStudies,
      includeExercises:   form.includeExercises,
      includeReferences:  form.includeReferences,
      customInstructions: form.customInstructions || undefined,
      sourceContext,
      provider:           form.provider || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: updFn, disabled: isGenerating }

  return (
    <GeneratorLayout
      title="Lecture Notes Generator"
      description="Generate comprehensive lecture notes"
      icon={BookOpen}
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

      {/* RAG — Source Materials */}
      <SourceMaterialsPanel
        sources={sources}
        onAdd={(parsed) => setSources((prev) => [...prev, ...parsed])}
        onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))}
        disabled={isGenerating}
        description="Upload lecture slides, textbook chapters, or notes. The AI will base the lecture notes on these materials and cite them as references."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Academic settings" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Duration (min)" type="number" value={form.duration}
          onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} disabled={isGenerating} />
        <TextField label="Target word count" type="number" value={form.wordCount}
          onChange={(e) => setForm((p) => ({ ...p, wordCount: e.target.value }))} placeholder="Auto" disabled={isGenerating} />
      </div>
      <FormSection label="Content options" />
      <ContentOptionsFields {...cfp} />
      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
