import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Link2 } from 'lucide-react'
import { libraryApi, type ShareLink } from '../../../lib/api/library.api'

function ShareLinkRow({ link, onRevoke }: { link: ShareLink & { documentId?: string }; onRevoke: (id: string) => void }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/shared/${link.token}`

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expired = link.expiresAt ? new Date(link.expiresAt) < new Date() : false

  return (
    <div className={`flex items-center gap-3 p-4 border border-border rounded-lg bg-card ${expired ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">{url}</p>
          {expired && <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Expired</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {link.allowDownload && <span className="flex items-center gap-0.5">Download <Check className="h-3 w-3" /></span>}
          {link.allowEdit && <span className="flex items-center gap-0.5">Edit <Check className="h-3 w-3" /></span>}
          {link.allowComment && <span className="flex items-center gap-0.5">Comment <Check className="h-3 w-3" /></span>}
          <span>{link.viewCount} views</span>
          {link.expiresAt && <span>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>}
          <span>Created {new Date(link.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={copy}
          className="text-xs border border-border px-3 py-1 rounded hover:bg-muted">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={() => { if (confirm('Revoke this share link?')) onRevoke(link.id) }}
          className="text-xs text-red-600 border border-red-200 px-3 py-1 rounded hover:bg-red-50">
          Revoke
        </button>
      </div>
    </div>
  )
}

function CreateShareModal({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [opts, setOpts] = useState({ allowDownload: true, allowEdit: false, allowComment: true, expiresAt: '', password: '' })

  const mutation = useMutation({
    mutationFn: () => libraryApi.createShareLink(documentId, {
      ...opts,
      expiresAt: opts.expiresAt || undefined,
      password: opts.password || undefined,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['share-links'] })
      onClose()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="font-semibold text-lg mb-4">Create Share Link</h3>
        <div className="space-y-3">
          {(['allowDownload', 'allowEdit', 'allowComment'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={opts[k] as boolean}
                onChange={(e) => setOpts((o) => ({ ...o, [k]: e.target.checked }))}
                className="rounded border-border" />
              <span className="text-sm">Allow {k.replace('allow', '').toLowerCase()}</span>
            </label>
          ))}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Expiry date (optional)</label>
            <input type="date" value={opts.expiresAt} onChange={(e) => setOpts((o) => ({ ...o, expiresAt: e.target.value }))}
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Password protection (optional)</label>
            <input type="password" value={opts.password} onChange={(e) => setOpts((o) => ({ ...o, password: e.target.value }))}
              placeholder="Leave blank for no password"
              className="w-full border border-border rounded px-3 py-2 text-sm bg-background" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {mutation.isPending ? 'Creating…' : 'Create Link'}
          </button>
          <button onClick={onClose} className="flex-1 border border-border py-2 rounded-lg text-sm hover:bg-muted">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function SharedDocumentsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [targetDocId, setTargetDocId] = useState('')

  // For demo, list all links for the first document — real app would list across all docs
  const { data: recentData } = useQuery({
    queryKey: ['library', { limit: 50 }],
    queryFn: () => libraryApi.list({ limit: 50 }),
  })
  const docs = (recentData as { data: Array<{ id: string; title: string }> } | undefined)?.data ?? []

  const [selectedDoc, setSelectedDoc] = useState<string>('')

  const { data: linksData } = useQuery({
    queryKey: ['share-links', selectedDoc],
    queryFn: () => libraryApi.listShareLinks(selectedDoc),
    enabled: !!selectedDoc,
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) => libraryApi.revokeShareLink(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['share-links'] }),
  })

  const links: ShareLink[] = (linksData as { data: ShareLink[] } | undefined)?.data ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Shared Documents</h1>
        <button onClick={() => { setTargetDocId(selectedDoc); setShowCreate(true) }}
          disabled={!selectedDoc}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
          + Create Share Link
        </button>
      </div>

      <div className="mb-4">
        <label className="text-sm text-muted-foreground block mb-1">Select document to manage share links:</label>
        <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none">
          <option value="">— Choose a document —</option>
          {docs.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>

      {selectedDoc && links.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Link2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p>No share links for this document</p>
        </div>
      )}

      <div className="space-y-3">
        {links.map((link) => (
          <ShareLinkRow key={link.id} link={link} onRevoke={(id) => revokeMutation.mutate(id)} />
        ))}
      </div>

      {showCreate && targetDocId && (
        <CreateShareModal documentId={targetDocId} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
