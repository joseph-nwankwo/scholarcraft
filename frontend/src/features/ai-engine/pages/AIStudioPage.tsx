import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, CalendarDays, ClipboardList, HelpCircle, GraduationCap,
  CheckSquare, Presentation, LayoutList, History, FileText, Sparkles, TrendingUp, Clock, Zap,
} from 'lucide-react'
import { generationApi } from '@/lib/api/generation.api'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

const GENERATORS = [
  { icon: BookOpen,      label: 'Lecture Notes',   desc: 'Comprehensive lecture notes with Bloom\'s Taxonomy',  route: ROUTES.GEN_LECTURE_NOTES,  color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950' },
  { icon: CalendarDays,  label: 'Lesson Plan',      desc: 'Structured weekly lesson plans with activities',      route: ROUTES.GEN_LESSON_PLAN,    color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950' },
  { icon: ClipboardList, label: 'Assignment',       desc: 'Academic assignments with grading rubrics',           route: ROUTES.GEN_ASSIGNMENT,     color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950' },
  { icon: HelpCircle,    label: 'Quiz',             desc: 'Quizzes with answer keys and explanations',           route: ROUTES.GEN_QUIZ,           color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950' },
  { icon: GraduationCap, label: 'Exam',             desc: 'Full examinations with marking instructions',         route: ROUTES.GEN_EXAM,           color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-950' },
  { icon: CheckSquare,   label: 'Marking Scheme',   desc: 'Detailed marking rubrics and model answers',          route: ROUTES.GEN_MARKING_SCHEME, color: 'text-teal-600',   bg: 'bg-teal-50 dark:bg-teal-950' },
  { icon: Presentation,  label: 'Presentation',     desc: 'Slide decks with speaker notes and structure',        route: ROUTES.GEN_PRESENTATION,   color: 'text-pink-600',   bg: 'bg-pink-50 dark:bg-pink-950' },
  { icon: LayoutList,    label: 'Course Outline',   desc: 'Full semester course outlines and syllabi',           route: ROUTES.GEN_COURSE_OUTLINE, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
] as const

export default function AIStudioPage() {
  const navigate = useNavigate()

  const { data: statsData } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: () => generationApi.getStats(),
    staleTime: 60_000,
  })

  const stats = statsData?.data

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Studio
          </h1>
          <p className="text-muted-foreground mt-1">Generate academic content powered by AI — lecture notes, assessments, plans and more.</p>
        </div>
        <button onClick={() => navigate(ROUTES.GEN_HISTORY)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <History className="h-4 w-4" />
          Generation history
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Zap} label="Today" value={stats.todayCount} suffix="generations" color="text-primary" />
          <StatCard icon={FileText} label="Total docs" value={stats.totalCount} color="text-violet-600" />
          <StatCard icon={Clock} label="Avg. time" value={`${(stats.avgGenerationTime / 1000).toFixed(1)}s`} color="text-amber-600" />
          <StatCard icon={TrendingUp} label="Tokens used" value={stats.tokenUsage.totalCostUsd > 0 ? `$${stats.tokenUsage.totalCostUsd.toFixed(4)}` : `${(stats.tokenUsage.input + stats.tokenUsage.output).toLocaleString()}`} color="text-green-600" />
        </div>
      )}

      {/* Generators grid */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Content generators</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {GENERATORS.map(({ icon: Icon, label, desc, route, color, bg }) => (
            <button key={route} onClick={() => navigate(route)}
              className="group relative text-left rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all duration-150">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl mb-4', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
              <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Recent activity</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {stats.recentActivity.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-muted shrink-0">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.document?.title ?? 'Untitled'}</p>
                    <p className="text-xs text-muted-foreground">{item.moduleType} · {item.provider}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                  <p className="text-xs text-muted-foreground">{(item.durationMs / 1000).toFixed(1)}s</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pt-2">
        <QuickLink label="All documents" route={ROUTES.GEN_DOCUMENTS} navigate={navigate} icon={FileText} />
        <QuickLink label="Prompt templates" route={ROUTES.GEN_TEMPLATES} navigate={navigate} icon={Sparkles} />
        <QuickLink label="Generation history" route={ROUTES.GEN_HISTORY} navigate={navigate} icon={History} />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, suffix, color }: { icon: React.FC<{ className?: string }>; label: string; value: string | number; suffix?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {suffix && <p className="text-xs text-muted-foreground">{suffix}</p>}
    </div>
  )
}

function QuickLink({ label, route, navigate, icon: Icon }: { label: string; route: string; navigate: (r: string) => void; icon: React.FC<{ className?: string }> }) {
  return (
    <button onClick={() => navigate(route)}
      className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
