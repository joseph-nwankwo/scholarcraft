import { useState } from 'react'
import { ArrowLeft, Plus, GraduationCap, Trash2 } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Badge } from '@/components/design-system/display/Badge'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { ConfirmDialog } from '@/components/design-system/feedback/ConfirmDialog'
import { Alert } from '@/components/design-system/feedback/Alert'
import { SkeletonCard } from '@/components/design-system/feedback/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheses } from '../hooks/useTheses'
import { useThesis } from '../hooks/useThesis'
import { ThesisOverviewTab } from '../components/ThesisOverviewTab'
import { ProposalBuilderTab } from '../components/ProposalBuilderTab'
import { ChaptersTab } from '../components/ChaptersTab'
import { CitationsTab } from '../components/CitationsTab'
import { SourcesTab } from '../components/SourcesTab'
import { ThesisAssistantTab } from '../components/ThesisAssistantTab'
import type { ThesisStatus } from '@/lib/api/thesiscraft.api'

const STATUS_VARIANT: Record<ThesisStatus, 'default' | 'warning' | 'success'> = {
  DRAFT: 'default',
  IN_PROGRESS: 'warning',
  COMPLETE: 'success',
}

export default function ThesisCraftPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (selectedId) {
    return <ThesisWorkspace thesisId={selectedId} onBack={() => setSelectedId(null)} />
  }
  return <ThesisList onSelect={setSelectedId} />
}

function ThesisList({ onSelect }: { onSelect: (id: string) => void }) {
  const { theses, loading, error, create, remove } = useTheses()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', field: '', degreeType: '', supervisorName: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const thesis = await create({
        title: form.title.trim(),
        field: form.field.trim() || undefined,
        degreeType: form.degreeType.trim() || undefined,
        supervisorName: form.supervisorName.trim() || undefined,
      })
      setForm({ title: '', field: '', degreeType: '', supervisorName: '' })
      setShowForm(false)
      onSelect(thesis.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ThesisCraft</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered research support — proposals, chapters, and citations.
          </p>
        </div>
        {!showForm && (
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowForm(true)}>New Thesis</Button>
        )}
      </div>

      {error && <Alert variant="warning" description={error} />}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 shadow-card space-y-4">
          <h3 className="font-semibold text-foreground">New Thesis</h3>
          <TextField label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Impact of AI Tutoring on Student Retention" required autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <TextField label="Field of study" value={form.field} onChange={(e) => setForm((p) => ({ ...p, field: e.target.value }))} placeholder="e.g. Computer Science" />
            <TextField label="Degree" value={form.degreeType} onChange={(e) => setForm((p) => ({ ...p, degreeType: e.target.value }))} placeholder="e.g. BSc, MSc, PhD" />
            <TextField label="Supervisor" value={form.supervisorName} onChange={(e) => setForm((p) => ({ ...p, supervisorName: e.target.value }))} placeholder="Optional" />
          </div>
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>Create Thesis</Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : theses.length === 0 && !showForm ? (
        <EmptyState
          icon={<GraduationCap className="h-7 w-7" />}
          title="No theses yet"
          description="Start a new thesis to build your proposal, draft chapters, and manage citations."
          action={{ label: 'New Thesis', onClick: () => setShowForm(true), icon: <Plus className="h-4 w-4" /> }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {theses.map((thesis) => (
            <div
              key={thesis.id}
              onClick={() => onSelect(thesis.id)}
              className="rounded-xl border bg-card p-5 shadow-card cursor-pointer hover:shadow-hover hover:-translate-y-px transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-foreground leading-snug">{thesis.title}</h3>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingId(thesis.id) }}
                  className="text-muted-foreground hover:text-error opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {[thesis.degreeType, thesis.field].filter(Boolean).join(' · ') || 'No field/degree set'}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant={STATUS_VARIANT[thesis.status]} size="sm">{thesis.status.replace('_', ' ').toLowerCase()}</Badge>
                <span className="text-xs text-muted-foreground">{thesis._count.chapters} chapters · {thesis._count.citations} citations</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete this thesis?"
        description="This will remove the thesis, all its chapters, and citations. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingId) await remove(deletingId)
          setDeletingId(null)
        }}
      />
    </div>
  )
}

function ThesisWorkspace({ thesisId, onBack }: { thesisId: string; onBack: () => void }) {
  const thesisState = useThesis(thesisId)
  const { thesis, loading, error } = thesisState

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> All Theses
      </button>

      {error && <Alert variant="warning" description={error} />}

      {loading || !thesis ? (
        <SkeletonCard />
      ) : (
        <Tabs defaultValue="template">
          <TabsList>
            <TabsTrigger value="template">Thesis Template</TabsTrigger>
            <TabsTrigger value="assistant">Thesis Assistant</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="proposal">Proposal</TabsTrigger>
                <TabsTrigger value="chapters">Chapters</TabsTrigger>
                <TabsTrigger value="citations">Citations</TabsTrigger>
                <TabsTrigger value="sources">Sources</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <ThesisOverviewTab thesisState={thesisState} />
              </TabsContent>
              <TabsContent value="proposal" className="mt-6">
                <ProposalBuilderTab thesisState={thesisState} />
              </TabsContent>
              <TabsContent value="chapters" className="mt-6">
                <ChaptersTab thesisState={thesisState} />
              </TabsContent>
              <TabsContent value="citations" className="mt-6">
                <CitationsTab thesisState={thesisState} />
              </TabsContent>
              <TabsContent value="sources" className="mt-6">
                <SourcesTab thesisState={thesisState} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="assistant" className="mt-6">
            <ThesisAssistantTab thesisState={thesisState} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
