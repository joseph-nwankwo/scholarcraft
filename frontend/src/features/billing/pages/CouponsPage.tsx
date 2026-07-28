import { useEffect, useState } from 'react'
import { Tag, Plus, XCircle } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'

interface Coupon {
  id: string; code: string; description: string | null
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'; discountValue: string
  expirationDate: string | null; usageLimit: number | null; usageCount: number; active: boolean
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    code: '', discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: '', expirationDate: '', usageLimit: '', description: '',
  })

  const load = () => {
    setLoading(true)
    billingApi.admin.getCoupons().then((res) => setCoupons(res.data.items)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCreate() {
    if (!form.code || !form.discountValue) return
    setCreating(true)
    try {
      await billingApi.admin.createCoupon({
        code: form.code, discountType: form.discountType,
        discountValue: Number(form.discountValue),
        expirationDate: form.expirationDate || undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        description: form.description || undefined,
      })
      setForm({ code: '', discountType: 'PERCENTAGE', discountValue: '', expirationDate: '', usageLimit: '', description: '' })
      load()
    } catch { alert('Failed to create coupon') }
    finally { setCreating(false) }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this coupon?')) return
    await billingApi.admin.revokeCoupon(id)
    load()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Tag className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Create Coupon</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Code (e.g. LAUNCH50)" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT' })}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="PERCENTAGE">Percentage (%)</option>
            <option value="FIXED_AMOUNT">Fixed Amount</option>
          </select>
          <input value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            placeholder={form.discountType === 'PERCENTAGE' ? 'Value (e.g. 20)' : 'Amount (e.g. 10)'}
            type="number" min="0" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            type="date" placeholder="Expiration date" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            type="number" min="1" placeholder="Usage limit (optional)" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <button onClick={handleCreate} disabled={creating || !form.code || !form.discountValue}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          <Plus className="w-4 h-4" /> {creating ? 'Creating...' : 'Create Coupon'}
        </button>
      </div>

      {/* Coupons list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Code</th>
              <th className="text-left p-4 font-semibold text-gray-600">Discount</th>
              <th className="text-left p-4 font-semibold text-gray-600">Used</th>
              <th className="text-left p-4 font-semibold text-gray-600">Expires</th>
              <th className="text-center p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No coupons yet</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-mono font-bold text-gray-800">{c.code}</td>
                <td className="p-4 text-gray-600">
                  {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `$${c.discountValue}`}
                </td>
                <td className="p-4 text-gray-600">{c.usageCount}{c.usageLimit !== null ? ` / ${c.usageLimit}` : ''}</td>
                <td className="p-4 text-gray-600">{c.expirationDate ? formatDate(c.expirationDate) : '—'}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {c.active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="p-4">
                  {c.active && (
                    <button onClick={() => handleRevoke(c.id)}
                      className="text-gray-400 hover:text-red-600" title="Revoke">
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
