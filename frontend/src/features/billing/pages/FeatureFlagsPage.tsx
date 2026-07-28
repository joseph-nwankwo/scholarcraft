import { useEffect, useState } from 'react'
import { Flag } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'

interface Flag { id: string; planId: string | null; name: string; enabled: boolean; plan?: { name: string; slug: string } }

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    billingApi.admin.getFeatureFlags().then((res) => setFlags(res.data.data)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function toggleFlag(flag: Flag) {
    setSaving(flag.id)
    try {
      await billingApi.admin.setFlag({ planId: flag.planId!, name: flag.name, enabled: !flag.enabled })
      setFlags((prev) => prev.map((f) => f.id === flag.id ? { ...f, enabled: !f.enabled } : f))
    } catch { alert('Failed to update flag') }
    finally { setSaving(null) }
  }

  // Group by plan
  const byPlan = flags.reduce<Record<string, { planName: string; flags: Flag[] }>>((acc, flag) => {
    const key = flag.planId ?? 'global'
    if (!acc[key]) acc[key] = { planName: flag.plan?.name ?? 'Global', flags: [] }
    acc[key].flags.push(flag)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Flag className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 p-8">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byPlan).map(([planId, group]) => (
            <div key={planId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">{group.planName} Plan</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {group.flags.map((flag) => (
                  <div key={flag.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{flag.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                      <p className="text-xs text-gray-400">{flag.name}</p>
                    </div>
                    <button
                      onClick={() => flag.planId && toggleFlag(flag)}
                      disabled={!flag.planId || saving === flag.id}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        flag.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                      } ${!flag.planId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        flag.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
