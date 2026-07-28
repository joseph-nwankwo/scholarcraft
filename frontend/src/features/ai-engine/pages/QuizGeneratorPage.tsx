import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
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

interface FormState extends CommonFormState { numberOfQuestions: string; quizFormat: string }

export default function QuizGeneratorPage() {
  const [form, setForm] = useState<FormState>({ ...COMMON_DEFAULTS, numberOfQuestions: '20', quizFormat: 'Mixed (MCQ + Short Answer + True/False)' })
  const [sources, setSources] = useState<UploadedSource[]>([])
  const [refs,    setRefs]    = useState('')
  const { content, isGenerating, isDone, error, documentId, tokensUsed, generate, cancel, reset } = useGenerator('quiz')

  function updFn(field: string, val: unknown) {
    setForm((p) => ({ ...p, [field]: val }) as unknown as FormState)
  }

  function handleGenerate() {
    const params: GenerationParams = {
      topic: form.topic, courseTitle: form.courseTitle || undefined, courseCode: form.courseCode || undefined,
      academicLevel: form.academicLevel, bloomLevel: form.bloomLevel || undefined,
      difficulty: form.difficulty,
      numberOfQuestions: form.numberOfQuestions ? Number(form.numberOfQuestions) : 20,
      language: form.language,
      customInstructions: (form.quizFormat ? `Format: ${form.quizFormat}. ` : '') + (form.customInstructions ?? ''),
      sourceContext: buildSourceContext(sources),
      provider: form.provider || undefined,
    }
    void generate({ ...params, customInstructions: [params.customInstructions, refs].filter(Boolean).join('\n\n') || undefined })
  }

  const cfp = { form, onChange: updFn, disabled: isGenerating }

  return (
    <GeneratorLayout title="Quiz Generator" description="Generate quizzes with answer keys"
      icon={HelpCircle} isGenerating={isGenerating} isDone={isDone} error={error}
      content={content} documentId={documentId} tokensUsed={tokensUsed}
      onGenerate={handleGenerate} onCancel={cancel} onReset={reset} formValid={!!form.topic.trim()}
    >
      <TopicFields {...cfp} />

      <SourceMaterialsPanel
        sources={sources}
        onAdd={(parsed) => setSources((prev) => [...prev, ...parsed])}
        onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))}
        disabled={isGenerating}
        description="Upload lecture notes, textbooks, or past papers. Quiz questions will be drawn directly from these materials."
      />
      <ReferencesPanel topic={form.topic} onSelect={setRefs} disabled={isGenerating} />

      <FormSection label="Quiz settings" />
      <AcademicLevelField {...cfp} />
      <BloomField {...cfp} />
      <DifficultyField {...cfp} />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Number of questions" type="number" value={form.numberOfQuestions}
          onChange={(e) => setForm((p) => ({ ...p, numberOfQuestions: e.target.value }))} disabled={isGenerating} />
      </div>
      <LabeledSelect label="Question format" value={form.quizFormat} onChange={(v) => setForm((p) => ({ ...p, quizFormat: v }))} disabled={isGenerating}>
        <option>Mixed (MCQ + Short Answer + True/False)</option>
        <option>Multiple Choice (MCQ) only</option>
        <option>Short Answer only</option>
        <option>True/False only</option>
        <option>Fill-in-the-blank</option>
        <option>Essay questions</option>
        <option>Matching</option>
      </LabeledSelect>
      <LanguageFields {...cfp} />
      <FormSection label="Advanced" />
      <ProviderField {...cfp} />
      <CustomInstructionsField {...cfp} />
    </GeneratorLayout>
  )
}
