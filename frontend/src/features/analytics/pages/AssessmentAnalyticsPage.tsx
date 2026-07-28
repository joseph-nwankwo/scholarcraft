import { useQuery } from '@tanstack/react-query'
import { HelpCircle, ClipboardList, Ruler, Target } from 'lucide-react'
import { analyticsApi } from '../../../lib/api/analytics.api'
import { BarChart, PieChart, RadarChart, StatCard, ProgressBar, PALETTE } from '../components/Charts'

const BLOOM_ORDER = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']
const BLOOM_COLORS = ['#6b7280', '#3b82f6', '#22c55e', '#f59e0b', '#f97316', '#8b5cf6']

export function AssessmentAnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['analytics-assessments'],
    queryFn: () => analyticsApi.getAssessmentStats(),
  })

  const { data: bloom, isLoading: bloomLoading } = useQuery({
    queryKey: ['analytics-bloom'],
    queryFn: () => analyticsApi.getBloomCoverage(),
  })

  const isLoading = statsLoading || bloomLoading

  const bloomRadar = BLOOM_ORDER.map((level, i) => {
    const found = bloom?.distribution.find((d) => d.level === level)
    return { subject: level.slice(0, 3), value: found?.count ?? 0, color: BLOOM_COLORS[i] }
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Assessment Analytics</h1>
        <p className="text-sm text-muted-foreground">Question bank health, Bloom's distribution, and assessment coverage</p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-muted rounded-xl animate-pulse" />)}</div>
        </div>
      )}

      {!isLoading && stats && bloom && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Questions" value={stats.questions.total} icon={<HelpCircle className="h-5 w-5" />} color="purple" />
            <StatCard label="Total Assessments" value={stats.assessments.total} icon={<ClipboardList className="h-5 w-5" />} color="blue" />
            <StatCard label="Rubrics" value={stats.rubrics} icon={<Ruler className="h-5 w-5" />} color="green" />
            <StatCard label="Learning Outcomes" value={stats.outcomes} icon={<Target className="h-5 w-5" />} color="amber" />
          </div>

          {/* Bloom's coverage */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold text-foreground">Bloom's Taxonomy Coverage</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bloom.coverageScore}% coverage · {bloom.total} questions
                  {bloom.missingLevels.length > 0 && ` · Missing: ${bloom.missingLevels.join(', ')}`}
                </p>
              </div>
              <div className={`text-2xl font-bold ${bloom.coverageScore >= 80 ? 'text-green-600' : bloom.coverageScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {bloom.coverageScore}%
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RadarChart data={bloomRadar} dataKey="value" angleKey="subject" height={220} />
              <div className="space-y-2.5">
                {BLOOM_ORDER.map((level, i) => {
                  const d = bloom.distribution.find((d) => d.level === level)
                  return (
                    <ProgressBar key={level} label={level} value={d?.count ?? 0} max={bloom.total || 1} color={BLOOM_COLORS[i]} />
                  )
                })}
              </div>
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Questions by Type</h3>
              <BarChart
                data={stats.questions.byType.map((t) => ({ name: t.type.replace('_', ' '), count: t.count }))}
                dataKey="count" xKey="name" color={PALETTE[0]} horizontal />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Difficulty Distribution</h3>
              <PieChart
                data={stats.questions.byDifficulty.map((d) => ({ name: d.difficulty, count: d.count }))}
                donut />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Moderation Status</h3>
              <PieChart
                data={stats.questions.byModeration.map((m) => ({ name: m.status.replace('_', ' '), count: m.count }))} />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Assessments by Type</h3>
              <BarChart
                data={stats.assessments.byType.map((t) => ({ name: t.type, count: t.count }))}
                dataKey="count" xKey="name" color={PALETTE[2]} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
