import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceApi } from '../../../lib/api/workspace.api'
import { ROUTES } from '../../../constants/routes'

interface Workspace {
  id: string
  name: string
  description: string | null
  visibility: string
  _count: { members: number }
  owner: { id: string; name: string; avatarUrl: string | null }
  members: { role: string }[]
}

export default function WorkspacesPage() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', visibility: 'PRIVATE' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    workspaceApi.list().then((res) => setWorkspaces(res.data.items ?? [])).finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await workspaceApi.create(form)
      navigate(ROUTES.WORKSPACE_DASHBOARD.replace(':id', res.data.data.id))
    } finally {
      setCreating(false)
    }
  }

  const visibilityColor = (v: string) =>
    v === 'PUBLIC' ? 'bg-green-100 text-green-700' : v === 'PRIVATE' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-500 mt-1">Collaborate with your team in shared spaces</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
        >
          + New Workspace
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create Workspace</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Engineering Faculty"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What is this workspace for?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg px-4 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={creating} className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl">
          <p className="text-gray-400 mb-4">No workspaces yet. Create one to get started.</p>
          <button onClick={() => setShowCreate(true)} className="text-indigo-600 font-medium text-sm">
            + Create your first workspace
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => navigate(ROUTES.WORKSPACE_DASHBOARD.replace(':id', ws.id))}
              className="bg-white border rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-lg font-bold text-indigo-600">
                  {ws.name[0]}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${visibilityColor(ws.visibility)}`}>
                  {ws.visibility}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{ws.name}</h3>
              {ws.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ws.description}</p>}
              <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                <span>{ws._count.members} members</span>
                {ws.members[0] && <span className="capitalize">{ws.members[0].role.toLowerCase()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
