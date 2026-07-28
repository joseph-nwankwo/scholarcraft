import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { type ReactNode } from 'react'
import { GraduationCap, Brain, BarChart2, Landmark } from 'lucide-react'
import { analyticsApi } from '../../../lib/api/analytics.api'
import { useAuth } from '../../../app/providers/AuthProvider'
import { RadarChart, PieChart, StatCard, ProgressBar, PALETTE } from '../components/Charts'

type InsightType = 'lecturer' | 'institution' | 'bloom' | 'assessment'

export function AIInsightsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'university_admin' || user?.role === 'administrator' || user?.role === 'dean'
  const [activeType, setActiveType] = useState<InsightType>('lecturer')

  const { data: bloomData } = useQuery({
    queryKey: ['analytics-bloom'],
    queryFn: () => analyticsApi.getBloomCoverage(),
  })

  const { data: assStats } = useQuery({
    queryKey: ['analytics-assessments'],
    queryFn: () => analyticsApi.getAssessmentStats(),
  })

  const insightQuery = useQuery({
    queryKey: ['insights', activeType],
    queryFn: () => {
      switch (activeType) {
        case 'lecturer': return analyticsApi.getLecturerInsights()
        case 'institution': return analyticsApi.getInstitutionInsights()
        case 'bloom': return analyticsApi.getBloomInsights()
        case 'assessment': return analyticsApi.getAssessmentInsights()
        default: return analyticsApi.getLecturerInsights()
      }
    },
    staleTime: 5 * 60 * 1000, // cache for 5 min
  })

  const tabs: Array<{ type: InsightType; label: string; icon: ReactNode }> = [
    { type: 'lecturer',   label: 'Teaching',         icon: <GraduationCap className="h-4 w-4" /> },
    { type: 'bloom',      label: "Bloom's Analysis", icon: <Brain className="h-4 w-4" /> },
    { type: 'assessment', label: 'Assessments',      icon: <BarChart2 className="h-4 w-4" /> },
    ...(isAdmin ? [{ type: 'institution' as InsightType, label: 'Institution', icon: <Landmark className="h-4 w-4" /> }] : []),
  ]

  const bloomChartData = (bloomData?.distribution ?? []).map((d) => ({
    subject: d.level, value: d.count, percentage: d.percentage,
  }))

  const diffData = (assStats?.questions.byDifficulty ?? []).map((d) => ({
    name: d.difficulty, count: d.count,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
        <p className="text-sm text-muted-foreground">AI-generated analysis and recommendations for your teaching practice</p>
      </div>

      {/* Visual overview cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {bloomData && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 text-foreground">Bloom's Coverage</h3>
            <p className="text-xs text-muted-foreground mb-2">
              {bloomData.coverageScore}% of Bloom's levels covered
              {bloomData.missingLevels.length > 0 && ` · Missing: ${bloomData.missingLevels.join(', ')}`}
            </p>
            {bloomChartData.length > 0
              ? <RadarChart data={bloomChartData} dataKey="value" angleKey="subject" color={PALETTE[0]} height={200} />
              : <p className="text-sm text-muted-foreground text-center py-8">No questions yet</p>
            }
          </div>
        )}

        {assStats && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-1 text-foreground">Difficulty Distribution</h3>
            <p className="text-xs text-muted-foreground mb-2">{assStats.questions.total} total questions</p>
            {diffData.length > 0
              ? <PieChart data={diffData} donut height={200} />
              : <p className="text-sm text-muted-foreground text-center py-8">No questions yet</p>
            }
          </div>
        )}

        {assStats && bloomData && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Quality Indicators</h3>
            <div className="space-y-3">
              <StatCard label="Coverage Score" value={`${bloomData.coverageScore}%`}
                color={bloomData.coverageScore >= 80 ? 'green' : bloomData.coverageScore >= 50 ? 'amber' : 'red'} />
              <div className="space-y-2">
                {(assStats.questions.byBloom ?? []).map((b) => (
                  <ProgressBar key={b.level} label={b.level} value={b.count} max={assStats.questions.total}
                    color={PALETTE[['REMEMBER','UNDERSTAND','APPLY','ANALYSE','EVALUATE','CREATE'].indexOf(b.level) % PALETTE.length]} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insight type tabs */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.type} onClick={() => setActiveType(t.type)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium shrink-0 transition-colors border-b-2 ${
                activeType === t.type
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}>
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {insightQuery.isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Generating AI insights…
              </div>
              {[95, 80, 88, 72, 85].map((w, i) => (
                <div key={i} className="h-4 bg-muted rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {insightQuery.error && (
            <div className="text-sm text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium">Could not generate insights</p>
              <p className="text-xs mt-1">{(insightQuery.error as Error).message}</p>
            </div>
          )}

          {insightQuery.data && !insightQuery.isLoading && (
            <div className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {insightQuery.data as string}
              </ReactMarkdown>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button onClick={() => void insightQuery.refetch()}
              disabled={insightQuery.isFetching}
              className="text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5 disabled:opacity-50">
              {insightQuery.isFetching ? 'Regenerating…' : '↻ Regenerate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
