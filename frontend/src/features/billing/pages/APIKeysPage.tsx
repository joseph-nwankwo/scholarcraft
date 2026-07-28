import { useEffect, useState } from 'react'
import { Key, Plus, RefreshCw, Trash2, Copy, Check } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'

interface APIKey {
  id: string; name: string; keyPrefix: string; scopes: string[]
  active: boolean; lastUsedAt: string | null; createdAt: string
}

interface NewKey { rawKey: string; apiKey: APIKey }

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [revealed, setRevealed] = useState<NewKey | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => {
    setLoading(true)
    billingApi.getApiKeys()
      .then((res) => setKeys(res.data.data))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const res = await billingApi.generateApiKey({ name: newKeyName })
      setRevealed(res.data)
      setNewKeyName('')
      load()
    } catch { alert('Failed to generate key') }
    finally { setCreating(false) }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key?')) return
    await billingApi.revokeApiKey(id)
    load()
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate this key? The existing key will stop working immediately.')) return
    const res = await billingApi.rotateApiKey(id)
    setRevealed(res.data)
    load()
  }

  function copyKey() {
    if (revealed?.rawKey) {
      navigator.clipboard.writeText(revealed.rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Key className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
      </div>

      {/* Revealed key alert */}
      {revealed && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            Save this key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded px-3 py-2 text-xs font-mono text-amber-900 break-all">
              {revealed.rawKey}
            </code>
            <button onClick={copyKey}
              className="flex-none p-2 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
            </button>
          </div>
          <button onClick={() => setRevealed(null)} className="mt-2 text-xs text-amber-600 hover:underline">
            I've saved it
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Create New API Key</h3>
        <div className="flex gap-3">
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production, CI)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button onClick={handleCreate} disabled={creating || !newKeyName.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {creating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Name</th>
              <th className="text-left p-4 font-semibold text-gray-600">Prefix</th>
              <th className="text-left p-4 font-semibold text-gray-600">Last Used</th>
              <th className="text-left p-4 font-semibold text-gray-600">Created</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : keys.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No API keys yet</td></tr>
            ) : keys.filter((k) => k.active).map((key) => (
              <tr key={key.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-800">{key.name}</td>
                <td className="p-4 font-mono text-gray-500 text-xs">{key.keyPrefix}...</td>
                <td className="p-4 text-gray-500">{key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}</td>
                <td className="p-4 text-gray-500">{formatDate(key.createdAt)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => handleRotate(key.id)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded" title="Rotate key">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRevoke(key.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Revoke key">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
