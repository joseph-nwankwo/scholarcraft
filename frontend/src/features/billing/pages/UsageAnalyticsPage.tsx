import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ProgressBar, BarChart } from '@/features/analytics/components/Charts'
import { formatDate } from '@/lib/utils/format'

interface UsageEntry {
  metric: string; label: string; used: number; limit: number | null
  percentage: number; unlimited: boolean
}

interface UsageSummary {
  periodStart: string | null; periodEnd: string | null
  plan: { name: string; slug: string } | null
  metrics: Record<string, UsageEntry>
}

interface HistoryRecord { metric: string; value: string; recordedAt: string }

export default function UsageAnalyticsPage() {
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.getUsageSummary(), billingApi.getUsageHistory({ limit: 60 })])
      .then(([sumRes, histRes]) => { setSummary(sumRes.data.data); setHistory(histRes.data.data) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading usage data...</div>
  if (!summary) return <div className="p-8 text-center text-gray-400">No usage data</div>

  const aiTokenHistory = history
    .filter((r) => r.metric === 'AI_TOKENS')
    .slice(0, 12)
    .reverse()
    .map((r) => ({ name: formatDate(r.recordedAt, 'MMM d'), value: Number(r.value) }))

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
        </div>
        {summary.periodEnd && (
          <p className="text-sm text-gray-500">Period ends {formatDate(summary.periodEnd)}</p>
        )}
      </div>

      {/* Plan info */}
      {summary.plan && (
        <div className="mb-6 px-4 py-3 bg-indigo-50 rounded-xl text-sm text-indigo-700">
          <strong>{summary.plan.name}</strong> plan · {summary.periodStart ? `${formatDate(summary.periodStart)} – ${formatDate(summary.periodEnd!)}` : ''}
        </div>
      )}

      {/* Metric bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Object.entries(summary.metrics).map(([key, entry]) => (
          <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{entry.label}</span>
              <span className="text-gray-500">
                {entry.unlimited ? 'Unlimited' : `${entry.used.toLocaleString()} / ${entry.limit?.toLocaleString()}`}
              </span>
            </div>
            {!entry.unlimited && (
              <>
                <ProgressBar value={entry.used} max={entry.limit ?? 1}
                  color={entry.percentage > 85 ? '#ef4444' : entry.percentage > 60 ? '#f59e0b' : '#6366f1'} />
                <p className="text-xs text-gray-400 mt-1">{entry.percentage}% used</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* AI token history chart */}
      {aiTokenHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">AI Token Usage History</h3>
          <BarChart
            data={aiTokenHistory}
            dataKey="value"
            xKey="name"
            color="#6366f1"
            height={200}
          />
        </div>
      )}
    </div>
  )
}
