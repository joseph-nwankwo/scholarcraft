import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { FileText, Bot, Zap, CheckCircle2 } from 'lucide-react'
import { analyticsApi } from '../../../lib/api/analytics.api'
import { StatCard, AreaChart, BarChart, PieChart, DateRangePicker, PALETTE } from '../components/Charts'

export function TeachingAnalyticsPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [from, setFrom] = useState(format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [to, setTo] = useState(today)
  const range = { from, to }

  const { data: docStats, isLoading: docLoading } = useQuery({
    queryKey: ['analytics-documents', from, to],
    queryFn: () => analyticsApi.getDocumentStats(range),
  })

  const { data: aiStats, isLoading: aiLoading } = useQuery({
    queryKey: ['analytics-ai', from, to],
    queryFn: () => analyticsApi.getAIUsageStats(range),
  })

  const { data: approvals, isLoading: appLoading } = useQuery({
    queryKey: ['analytics-approvals', from, to],
    queryFn: () => analyticsApi.getApprovalStats(range),
  })

  const { data: productivity, isLoading: prodLoading } = useQuery({
    queryKey: ['analytics-productivity', from, to],
    queryFn: () => analyticsApi.getProductivity(range),
  })

  const isLoading = docLoading || aiLoading || appLoading

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teaching Analytics</h1>
          <p className="text-sm text-muted-foreground">Productivity, document activity, and AI usage</p>
        </div>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
        </div>
      )}

      {!isLoading && docStats && aiStats && approvals && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Documents" value={docStats.total} icon={<FileText className="h-5 w-5" />} color="blue" sub={`+${docStats.createdThisPeriod} this period`} />
            <StatCard label="AI Generations" value={aiStats.aggregate.totalGenerations} icon={<Bot className="h-5 w-5" />} color="purple" />
            <StatCard label="Total Tokens" value={aiStats.aggregate.totalTokens.toLocaleString()} icon={<Zap className="h-5 w-5" />} color="amber" />
            <StatCard label="Approval Rate" value={`${approvals.approvalRate}%`} icon={<CheckCircle2 className="h-5 w-5" />}
              color={approvals.approvalRate >= 80 ? 'green' : approvals.approvalRate >= 60 ? 'amber' : 'red'} />
          </div>

          {/* Time series */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Document Creation</h3>
              <AreaChart data={docStats.timeSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="Documents" color={PALETTE[0]} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">AI Generations</h3>
              <AreaChart data={aiStats.timeSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="Tokens" color={PALETTE[1]} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Documents by Type</h3>
              <PieChart data={docStats.byType.map((d) => ({ name: d.type, count: d.count }))} donut />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Approval Status</h3>
              <PieChart data={approvals.byStatus.map((a) => ({ name: a.status, count: a.count }))} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">AI Cost Trend</h3>
              <AreaChart data={aiStats.costSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="Cost (USD)" color={PALETTE[3]} />
            </div>
          </div>

          {/* AI by provider */}
          {aiStats.byProvider.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">AI Usage by Provider</h3>
                <BarChart data={aiStats.byProvider.map((p) => ({ name: p.provider, generations: p.generations }))}
                  dataKey="generations" xKey="name" color={PALETTE[4]} />
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3 text-foreground">AI Usage by Module</h3>
                <BarChart data={aiStats.byModule.map((m) => ({ name: m.moduleType, generations: m.generations }))}
                  dataKey="generations" xKey="name" color={PALETTE[5]} horizontal />
              </div>
            </div>
          )}

          {/* Productivity leaderboard */}
          {!prodLoading && productivity && productivity.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">Productivity Leaderboard</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Dept</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Docs</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Questions</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">AI Uses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productivity.slice(0, 10).map((p, i) => (
                      <tr key={p.userId} className="border-t border-border">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-2 text-muted-foreground text-xs">{p.department ?? '—'}</td>
                        <td className="px-4 py-2 text-right">{p.documents}</td>
                        <td className="px-4 py-2 text-right">{p.questions}</td>
                        <td className="px-4 py-2 text-right">{p.aiGenerations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
