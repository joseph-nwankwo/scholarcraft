import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import {
  FileText, CalendarDays, HelpCircle, ClipboardList, Bot, DollarSign,
  Users, Landmark, Zap, CheckCircle2, Clock, Inbox, Sparkles, GraduationCap,
} from 'lucide-react'
import {
  analyticsApi,
  type LecturerDashboard,
  type DepartmentDashboard,
  type FacultyDashboard,
  type InstitutionDashboard,
} from '../../../lib/api/analytics.api'
import { StatCard, AreaChart, BarChart, PieChart, DateRangePicker } from '../components/Charts'
import { ROUTES } from '../../../constants/routes'
import { useAuth } from '../../../app/providers/AuthProvider'

type Role = 'LECTURER' | 'TEACHING_ASSISTANT' | 'DEPARTMENT_HEAD' | 'DEAN' | 'UNIVERSITY_ADMIN' | 'ADMINISTRATOR'

function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n) }

// ── Lecturer view ─────────────────────────────────────────────────────────────
function LecturerDashboardView({ data }: { data: LecturerDashboard }) {
  const s = data.summary
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Documents" value={s.totalDocs} icon={<FileText className="h-5 w-5" />} color="blue" />
        <StatCard label="This Month" value={s.docsThisPeriod} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Questions" value={s.questionsCount} icon={<HelpCircle className="h-5 w-5" />} color="purple" />
        <StatCard label="Assessments" value={s.assessmentsCount} icon={<ClipboardList className="h-5 w-5" />} color="green" />
        <StatCard label="AI Generations" value={s.aiGenerations} icon={<Bot className="h-5 w-5" />} color="amber" />
        <StatCard label="AI Cost" value={`$${s.aiCostUsd.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />}
          color={s.aiCostUsd > 10 ? 'amber' : 'default'} />
      </div>

      {s.approvalRate !== null && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold ${s.approvalRate >= 80 ? 'text-green-600' : s.approvalRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
              {s.approvalRate}%
            </div>
            <div>
              <p className="font-medium text-sm">Approval Rate</p>
              <p className="text-xs text-muted-foreground">{s.pendingApprovals} pending approvals</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Documents Created (30 days)</h3>
          <AreaChart data={data.docSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="Documents" color="#6366f1" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">AI Generations (30 days)</h3>
          <AreaChart data={data.aiSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="Generations" color="#22c55e" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.docsByType.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Documents by Type</h3>
            <PieChart data={data.docsByType.map((d) => ({ name: d.type, count: d.count }))} donut />
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Recent Documents</h3>
          <div className="space-y-2">
            {data.recentDocs.length === 0 && <p className="text-sm text-muted-foreground">No documents yet</p>}
            {data.recentDocs.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">{d.type.slice(0, 6)}</span>
                <span className="text-foreground truncate flex-1">{d.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(d.createdAt), 'MMM d')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Department (HOD) view ─────────────────────────────────────────────────────
function DepartmentDashboardView({ data, department }: { data: DepartmentDashboard; department: string }) {
  const s = data.summary
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Lecturers" value={s.lecturersCount} icon={<GraduationCap className="h-5 w-5" />} color="blue" />
        <StatCard label="Total Docs" value={s.totalDocs} icon={<FileText className="h-5 w-5" />} sub={`+${s.docsThisPeriod} this period`} />
        <StatCard label="Questions" value={fmt(s.totalQuestions)} icon={<HelpCircle className="h-5 w-5" />} color="purple" />
        <StatCard label="Approved Qs" value={s.approvedQuestions} icon={<CheckCircle2 className="h-5 w-5" />} color="green" />
        <StatCard label="Pending Review" value={s.pendingModeration} icon={<Clock className="h-5 w-5" />}
          color={s.pendingModeration > 0 ? 'amber' : 'default'} />
        <StatCard label="Pending Approvals" value={s.pendingApprovals} icon={<Inbox className="h-5 w-5" />}
          color={s.pendingApprovals > 0 ? 'amber' : 'default'} />
        <StatCard label="AI Cost" value={`$${s.aiCostUsd.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />}
          color={s.aiCostUsd > 50 ? 'amber' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.docsByType.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Documents by Type — {department}</h3>
            <PieChart data={data.docsByType.map((d) => ({ name: d.type, count: d.count }))} donut />
          </div>
        )}

        {data.teachingLoad.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">AI Activity by Lecturer</h3>
            <BarChart
              data={data.teachingLoad.map((l) => ({ name: l.name.split(' ')[0], docs: l.documents, ai: l.aiGenerations }))}
              dataKey="docs" xKey="name" label="Documents" color="#6366f1" horizontal />
          </div>
        )}
      </div>

      {data.teachingLoad.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="text-sm font-semibold text-foreground">Teaching Load — {department}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Role</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Docs</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Questions</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">AI Uses</th>
                </tr>
              </thead>
              <tbody>
                {data.teachingLoad.map((l, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2 font-medium text-foreground">{l.name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{l.role.replace('_', ' ')}</td>
                    <td className="px-4 py-2 text-right">{l.documents}</td>
                    <td className="px-4 py-2 text-right">{l.questions}</td>
                    <td className="px-4 py-2 text-right">{l.aiGenerations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Faculty (Dean) view ───────────────────────────────────────────────────────
function FacultyDashboardView({ data }: { data: FacultyDashboard }) {
  const s = data.summary
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Departments" value={s.departmentsCount} icon={<Landmark className="h-5 w-5" />} color="blue" />
        <StatCard label="Lecturers" value={s.lecturersCount} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Total Docs" value={fmt(s.totalDocs)} icon={<FileText className="h-5 w-5" />} color="purple" />
        <StatCard label="Assessments" value={s.assessments} icon={<ClipboardList className="h-5 w-5" />} color="green" />
        <StatCard label="Tokens Used" value={fmt(s.tokensUsed)} icon={<Zap className="h-5 w-5" />} color="amber" />
        <StatCard label="AI Cost" value={`$${s.aiCostUsd.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />}
          color={s.aiCostUsd > 100 ? 'amber' : 'default'} />
      </div>

      {data.deptBreakdown.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">Documents by Department</h3>
              <BarChart
                data={data.deptBreakdown.map((d) => ({ name: d.department, documents: d.documents }))}
                dataKey="documents" xKey="name" label="Documents" color="#6366f1" horizontal />
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-foreground">AI Generations by Department</h3>
              <BarChart
                data={data.deptBreakdown.map((d) => ({ name: d.department, ai: d.aiGenerations }))}
                dataKey="ai" xKey="name" label="AI Uses" color="#22c55e" horizontal />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">Department Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Department</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Lecturers</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Documents</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Questions</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">AI Uses</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deptBreakdown.map((d, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium text-foreground">{d.department}</td>
                      <td className="px-4 py-2 text-right">{d.lecturers}</td>
                      <td className="px-4 py-2 text-right">{d.documents}</td>
                      <td className="px-4 py-2 text-right">{d.questions}</td>
                      <td className="px-4 py-2 text-right">{d.aiGenerations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Institution view ──────────────────────────────────────────────────────────
function InstitutionDashboardView({ data }: { data: InstitutionDashboard }) {
  const s = data.summary
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Active Users" value={s.activeUsers} icon={<Users className="h-5 w-5" />} color="blue" sub={`of ${s.totalUsers} total`} />
        <StatCard label="New Users" value={s.newUsersThisPeriod} icon={<Sparkles className="h-5 w-5" />} color="green" sub="this month" />
        <StatCard label="Documents" value={fmt(s.totalDocs)} icon={<FileText className="h-5 w-5" />} sub={`+${s.docsThisPeriod} this month`} />
        <StatCard label="Questions" value={fmt(s.totalQuestions)} icon={<HelpCircle className="h-5 w-5" />} color="purple" />
        <StatCard label="Assessments" value={s.totalAssessments} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="AI Cost" value={`$${s.aiCostUsd.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} color="amber"
          trend={s.aiCostChange !== null ? { value: s.aiCostChange, label: 'vs last month' } : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Content Growth (30 days)</h3>
          <AreaChart data={data.growthSeries as unknown as Record<string, unknown>[]} dataKey="value" xKey="date" label="New Documents" color="#6366f1" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Users by Role</h3>
          <PieChart data={data.usersByRole.map((r) => ({ name: r.role, count: r.count }))} donut />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">AI by Provider</h3>
          <BarChart data={data.aiByProvider.map((p) => ({ name: p.provider, generations: p.generations }))}
            dataKey="generations" xKey="name" color="#8b5cf6" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3 text-foreground">Documents by Status</h3>
          <PieChart data={data.docsByStatus.map((d) => ({ name: d.status, count: d.count }))} />
        </div>
      </div>

      <div className="bg-muted/50 border border-border rounded-xl p-4 flex flex-wrap gap-6 text-sm">
        <div><span className="text-muted-foreground">Pending Approvals: </span><span className="font-semibold">{s.pendingApprovals}</span></div>
        <div><span className="text-muted-foreground">Total Tokens: </span><span className="font-semibold">{fmt(s.tokensUsed)}</span></div>
        <div><span className="text-muted-foreground">AI Generations: </span><span className="font-semibold">{s.aiGenerations}</span></div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AnalyticsDashboardPage() {
  const { user } = useAuth()
  const role = (user?.role as Role | undefined) ?? 'LECTURER'
  const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR'
  const isHOD = role === 'DEPARTMENT_HEAD'
  const isDean = role === 'DEAN'

  const today = format(new Date(), 'yyyy-MM-dd')
  const month30 = format(subDays(new Date(), 29), 'yyyy-MM-dd')
  const [from, setFrom] = useState(month30)
  const [to, setTo] = useState(today)

  const extra: Record<string, string> = {}
  if (isHOD && user?.department) extra.department = user.department
  if (isDean && (user as { faculty?: string } | undefined)?.faculty)
    extra.faculty = (user as { faculty?: string }).faculty!

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', role, from, to, extra],
    queryFn: () => analyticsApi.getDashboard({ from, to }, extra),
  })

  const subtitle = isAdmin
    ? 'Institution overview'
    : isDean
      ? `Faculty overview`
      : isHOD
        ? `Department: ${user?.department ?? ''}`
        : 'My teaching activity'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t) }} />
          <div className="flex gap-2">
            <Link to={ROUTES.ANALYTICS_TEACHING}
              className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
              Teaching
            </Link>
            <Link to={ROUTES.ANALYTICS_ASSESSMENTS}
              className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
              Assessments
            </Link>
            <Link to={ROUTES.AI_INSIGHTS}
              className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-muted">
              AI Insights
            </Link>
            <Link to={ROUTES.REPORTS}
              className="text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90">
              Reports
            </Link>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <div key={i} className="h-56 bg-muted rounded-xl animate-pulse" />)}
          </div>
        </div>
      )}

      {!isLoading && !!data && (
        isAdmin
          ? <InstitutionDashboardView data={data as unknown as InstitutionDashboard} />
          : isDean
            ? <FacultyDashboardView data={data as unknown as FacultyDashboard} />
            : isHOD
              ? <DepartmentDashboardView data={data as unknown as DepartmentDashboard} department={user?.department ?? ''} />
              : <LecturerDashboardView data={data as unknown as LecturerDashboard} />
      )}
    </div>
  )
}

export default AnalyticsDashboardPage
