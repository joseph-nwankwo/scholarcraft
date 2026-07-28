import { useState } from 'react'
import { Sparkles, Save } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { thesiscraftApi } from '@/lib/api/thesiscraft.api'
import { MarkdownEditor } from './MarkdownEditor'
import type { useThesis } from '../hooks/useThesis'

const SECTIONS = [
  { key: 'background',   label: 'Background of the Study' },
  { key: 'problem',       label: 'Problem Statement' },
  { key: 'objectives',    label: 'Aim & Objectives' },
  { key: 'questions',     label: 'Research Questions / Hypotheses' },
  { key: 'significance',  label: 'Significance of the Study' },
  { key: 'scope',         label: 'Scope & Limitations' },
]

interface Props {
  thesisState: ReturnType<typeof useThesis>
}

export function ProposalBuilderTab({ thesisState }: Props) {
  const { thesis, updateProposal } = thesisState
  const [sections, setSections] = useState<Record<string, string>>(thesis?.proposalSections ?? {})
  const [generatingKey, setGeneratingKey] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  if (!thesis) return null

  async function handleGenerate(key: string, label: string) {
    setError('')
    setGeneratingKey(key)
    try {
      const content = await thesiscraftApi.generateProposalSection(thesis!.id, label)
      setSections((prev) => ({ ...prev, [key]: content }))
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? `Could not generate the "${label}" section. Please try again.`)
    } finally {
      setGeneratingKey(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProposal(sections)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="warning" description={error} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proposal Builder</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Draft each section, or let AI generate a starting point you can edit.</p>
        </div>
        <Button onClick={handleSave} loading={saving} variant={saved ? 'success' : 'primary'} leftIcon={<Save className="h-4 w-4" />}>
          {saved ? 'Saved!' : 'Save Proposal'}
        </Button>
      </div>

      <div className="space-y-5">
        {SECTIONS.map(({ key, label }) => (
          <div key={key} className="rounded-xl border bg-card p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">{label}</h3>
              <Button
                variant="outline"
                size="sm"
                loading={generatingKey === key}
                disabled={generatingKey !== null}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
                onClick={() => handleGenerate(key, label)}
              >
                Generate with AI
              </Button>
            </div>
            <MarkdownEditor
              value={sections[key] ?? ''}
              onChange={(value) => setSections((prev) => ({ ...prev, [key]: value }))}
              placeholder={`Write or generate the ${label.toLowerCase()}…`}
              rows={6}
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} loading={saving} variant={saved ? 'success' : 'primary'} leftIcon={<Save className="h-4 w-4" />}>
        {saved ? 'Saved!' : 'Save Proposal'}
      </Button>
    </div>
  )
}
