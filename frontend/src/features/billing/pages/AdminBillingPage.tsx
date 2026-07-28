import { useEffect, useState } from 'react'

import { billingApi } from '@/lib/api/billing.api'
import { AreaChart } from '@/features/analytics/components/Charts'

interface SubStats {
  total: number; active: number; trialing: number; mrr: number; arr: number
  byStatus: Array<{ status: string; count: number }>
}

interface RevenueStats {
  total: number; count: number
  byMonth: Array<{ month: string; revenue: number }>
}

export default function AdminBillingPage() {
  const [subStats, setSubStats] = useState<SubStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.admin.getSubscriptionStats(), billingApi.admin.getRevenueStats()])
      .then(([subRes, revRes]) => { setSubStats(subRes.data.data); setRevenue(revRes.data.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading billing dashboard...</div>

  const monthlyData = revenue?.byMonth.map((m) => ({ name: m.month, value: m.revenue })) ?? []

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Billing Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'MRR', value: `$${(subStats?.mrr ?? 0).toFixed(2)}`, color: 'green' as const },
          { label: 'ARR', value: `$${(subStats?.arr ?? 0).toFixed(2)}`, color: 'blue' as const },
          { label: 'Active Subs', value: String(subStats?.active ?? 0), color: 'default' as const },
          { label: 'Trialing', value: String(subStats?.trialing ?? 0), color: 'amber' as const },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color === 'green' ? 'bg-green-50 border-green-200' : s.color === 'blue' ? 'bg-blue-50 border-blue-200' : s.color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue</h3>
          <AreaChart data={monthlyData} dataKey="value" xKey="name" color="#10b981" height={240} />
        </div>
      )}

      {/* Subscriptions by status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Subscriptions by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {subStats?.byStatus.map((s) => (
            <div key={s.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700 capitalize">{s.status.toLowerCase()}</span>
              <span className="font-bold text-gray-900">{s.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue total */}
      {revenue && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-2">All-time Revenue</h3>
          <p className="text-3xl font-bold text-gray-900">
            ${revenue.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-gray-500 mt-1">{revenue.count} paid invoices</p>
        </div>
      )}
    </div>
  )
}
