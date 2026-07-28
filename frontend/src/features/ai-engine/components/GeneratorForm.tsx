import { TextField } from '@/components/design-system/inputs/TextField'
import type { AcademicLevel, BloomLevel, Difficulty, AIProvider } from '@/lib/api/generation.api'

// ── Shared field types ────────────────────────────────────────────────────────

export interface CommonFormState {
  topic: string
  courseTitle: string
  courseCode: string
  academicLevel: AcademicLevel
  bloomLevel: BloomLevel | ''
  difficulty: Difficulty
  wordCount: string
  duration: string
  language: string
  tone: string
  referenceStyle: string
  includeExamples: boolean
  includeCaseStudies: boolean
  includeExercises: boolean
  includeReferences: boolean
  customInstructions: string
  provider: AIProvider | ''
}

export const COMMON_DEFAULTS: CommonFormState = {
  topic: '', courseTitle: '', courseCode: '',
  academicLevel: 'BSC', bloomLevel: '', difficulty: 'MIXED',
  wordCount: '', duration: '', language: 'English',
  tone: 'Academic', referenceStyle: 'APA 7th',
  includeExamples: true, includeCaseStudies: false,
  includeExercises: true, includeReferences: true,
  customInstructions: '', provider: '',
}

// ── Select components ─────────────────────────────────────────────────────────

const sel = 'w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'

export function LabeledSelect({ label, value, onChange, children, disabled }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={sel}>
        {children}
      </select>
    </div>
  )
}

export function CheckboxField({ label, checked, onChange, disabled }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled}
        className="h-4 w-4 rounded border border-input accent-primary" />
      <span className="text-sm">{label}</span>
    </label>
  )
}

// ── Common fields ─────────────────────────────────────────────────────────────

export interface CommonFieldsProps {
  form: CommonFormState
  onChange: (field: string, value: unknown) => void
  disabled?: boolean
}

export function TopicFields({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic *</label>
        <textarea value={form.topic} onChange={(e) => onChange('topic', e.target.value)} disabled={disabled} rows={3}
          placeholder="e.g. Introduction to Computer Networks and OSI Model"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Course title" value={form.courseTitle} onChange={(e) => onChange('courseTitle', e.target.value)} placeholder="e.g. Database Management" disabled={disabled} />
        <TextField label="Course code" value={form.courseCode} onChange={(e) => onChange('courseCode', e.target.value)} placeholder="CSC 401" disabled={disabled} />
      </div>
    </>
  )
}

export function AcademicLevelField({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <LabeledSelect label="Academic Level" value={form.academicLevel} onChange={(v) => onChange('academicLevel', v as AcademicLevel)} disabled={disabled}>
      <option value="ND">National Diploma (ND)</option>
      <option value="HND">Higher National Diploma (HND)</option>
      <option value="BSC">Bachelor's Degree (BSc)</option>
      <option value="MSC">Master's Degree (MSc)</option>
      <option value="MBA">MBA</option>
      <option value="PHD">PhD</option>
      <option value="PROFESSIONAL">Professional / CPD</option>
    </LabeledSelect>
  )
}

export function BloomField({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <LabeledSelect label="Bloom's Level (optional)" value={form.bloomLevel} onChange={(v) => onChange('bloomLevel', v as BloomLevel | '')} disabled={disabled}>
      <option value="">Any level</option>
      <option value="REMEMBER">Remember</option>
      <option value="UNDERSTAND">Understand</option>
      <option value="APPLY">Apply</option>
      <option value="ANALYSE">Analyse</option>
      <option value="EVALUATE">Evaluate</option>
      <option value="CREATE">Create</option>
    </LabeledSelect>
  )
}

export function DifficultyField({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <LabeledSelect label="Difficulty" value={form.difficulty} onChange={(v) => onChange('difficulty', v as Difficulty)} disabled={disabled}>
      <option value="EASY">Easy</option>
      <option value="MEDIUM">Medium</option>
      <option value="HARD">Hard</option>
      <option value="MIXED">Mixed</option>
    </LabeledSelect>
  )
}

export function ContentOptionsFields({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <div className="space-y-2.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Include</label>
      <CheckboxField label="Examples" checked={form.includeExamples} onChange={(v) => onChange('includeExamples', v)} disabled={disabled} />
      <CheckboxField label="Case studies" checked={form.includeCaseStudies} onChange={(v) => onChange('includeCaseStudies', v)} disabled={disabled} />
      <CheckboxField label="Exercises" checked={form.includeExercises} onChange={(v) => onChange('includeExercises', v)} disabled={disabled} />
      <CheckboxField label="References" checked={form.includeReferences} onChange={(v) => onChange('includeReferences', v)} disabled={disabled} />
    </div>
  )
}

export function LanguageFields({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <LabeledSelect label="Language" value={form.language} onChange={(v) => onChange('language', v)} disabled={disabled}>
        <option>English</option>
        <option>Yoruba</option>
        <option>Hausa</option>
        <option>Igbo</option>
        <option>Pidgin</option>
        <option>French</option>
      </LabeledSelect>
      <LabeledSelect label="Reference style" value={form.referenceStyle} onChange={(v) => onChange('referenceStyle', v)} disabled={disabled}>
        <option>APA 7th</option>
        <option>MLA 9th</option>
        <option>Harvard</option>
        <option>Chicago</option>
        <option>Vancouver</option>
        <option>IEEE</option>
      </LabeledSelect>
    </div>
  )
}

export function ProviderField({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <LabeledSelect label="AI Provider (optional)" value={form.provider} onChange={(v) => onChange('provider', v as AIProvider | '')} disabled={disabled}>
      <option value="">Auto (default)</option>
      <option value="anthropic">Claude (Anthropic)</option>
      <option value="openai">GPT-4o (OpenAI)</option>
      <option value="gemini">Gemini (Google)</option>
    </LabeledSelect>
  )
}

export function CustomInstructionsField({ form, onChange, disabled }: CommonFieldsProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom instructions</label>
      <textarea value={form.customInstructions} onChange={(e) => onChange('customInstructions', e.target.value)} disabled={disabled} rows={2}
        placeholder="Any additional instructions for the AI…"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
      />
    </div>
  )
}

// Section divider
export function FormSection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
