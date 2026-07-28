import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Plus, Pencil, Trash2, Globe, Lock, Star, Search } from 'lucide-react'
import { templateApi, type PromptTemplate } from '@/lib/api/generation.api'
import { Button } from '@/components/design-system/buttons/Button'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Modal } from '@/components/design-system/overlay/Modal'
import { useToast } from '@/lib/hooks/useToast'

const CATEGORIES = ['All', 'lecture-notes', 'lesson-plan', 'assignment', 'quiz', 'exam', 'marking-scheme', 'presentation', 'course-outline']

const EMPTY: Partial<PromptTemplate> = { name: '', category: 'lecture-notes', prompt: '', systemPrompt: '', isPublic: false, isDefault: false }

export default function PromptTemplatesPage() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Partial<PromptTemplate>>(EMPTY)
  const [isNew, setIsNew] = useState(true)

  const { data, isLoading } = useQuery({
    queryKey: ['templates', category],
    queryFn: () => templateApi.list(category === 'All' ? undefined : category),
    staleTime: 60_000,
  })

  const save = useMutation({
    mutationFn: () => isNew ? templateApi.create(editing) : templateApi.update(editing.id!, editing),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['templates'] }); setModalOpen(false); toast({ title: `Template ${isNew ? 'created' : 'updated'}` }) },
    onError: () => toast({ title: 'Failed to save template', variant: 'destructive' }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => templateApi.delete(id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['templates'] }); toast({ title: 'Template deleted' }) },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' }),
  })

  function openNew() { setEditing(EMPTY); setIsNew(true); setModalOpen(true) }
  function openEdit(t: PromptTemplate) { setEditing({ ...t }); setIsNew(false); setModalOpen(true) }

  const templates = (data?.data ?? []).filter((t) =>
    search ? t.name.toLowerCase().includes(search.toLowerCase()) : true
  )

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Prompt Templates</h1>
        </div>
        <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>New template</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <TextField placeholder="Search templates…" value={search} leftIcon={<Search className="h-4 w-4" />}
          onChange={(e) => setSearch(e.target.value)} className="w-56" />
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${category === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
              {c === 'All' ? 'All' : c.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading && <div className="text-center py-12 text-muted-foreground">Loading templates…</div>}
      {!isLoading && templates.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p>No templates yet. Create your first prompt template.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.category.replace('-', ' ')}</p>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove.mutate(t.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{t.prompt}</p>
            <div className="flex items-center gap-1.5">
              {t.isDefault && <Badge variant="default" size="sm"><Star className="h-2.5 w-2.5 mr-1" />Default</Badge>}
              {t.isPublic ? <Badge variant="success" size="sm"><Globe className="h-2.5 w-2.5 mr-1" />Public</Badge>
                : <Badge variant="default" size="sm"><Lock className="h-2.5 w-2.5 mr-1" />Private</Badge>}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isNew ? 'New Template' : 'Edit Template'}>
        <div className="space-y-4">
          {save.error && <Alert variant="error" description="Failed to save template" />}
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Name *" value={editing.name ?? ''} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
              <select value={editing.category ?? 'lecture-notes'} onChange={(e) => setEditing((p) => ({ ...p, category: e.target.value }))}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c.replace('-', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prompt *</label>
            <textarea rows={5} value={editing.prompt ?? ''} onChange={(e) => setEditing((p) => ({ ...p, prompt: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder="Write your prompt template here…" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System prompt (optional)</label>
            <textarea rows={3} value={editing.systemPrompt ?? ''} onChange={(e) => setEditing((p) => ({ ...p, systemPrompt: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editing.isPublic ?? false} onChange={(e) => setEditing((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
              Make public
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={editing.isDefault ?? false} onChange={(e) => setEditing((p) => ({ ...p, isDefault: e.target.checked }))} className="h-4 w-4 rounded accent-primary" />
              Set as default
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}
              disabled={!editing.name?.trim() || !editing.prompt?.trim()}>
              {isNew ? 'Create' : 'Save changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
