import type React from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

// ── Colour helpers ────────────────────────────────────────────────────────────
const IS_DARK = () => document.documentElement.classList.contains('dark')
const GRID_STROKE  = () => IS_DARK() ? 'oklch(0.3 0 0)' : 'oklch(0.92 0 0)'
const MUTED_TEXT   = () => IS_DARK() ? 'oklch(0.65 0 0)' : 'oklch(0.55 0 0)'
const PRIMARY = 'oklch(0.55 0.22 250)'
const CHART_COLORS = ['oklch(0.55 0.22 250)', 'oklch(0.60 0.18 160)', 'oklch(0.70 0.18 55)', 'oklch(0.60 0.18 25)', 'oklch(0.60 0.20 300)']

// ── Shared tooltip style ──────────────────────────────────────────────────────
const tooltipStyle: React.CSSProperties = {
  borderRadius: '0.5rem',
  border: '1px solid var(--border)',
  background: 'var(--card)',
  color: 'var(--foreground)',
  fontSize: '12px',
  boxShadow: 'var(--shadow-dropdown-value)',
}

// ── Shared chart card wrapper ─────────────────────────────────────────────────
interface ChartCardProps {
  title: string
  subtitle?: string
  loading?: boolean
  className?: string
  children: React.ReactNode
  action?: React.ReactNode
  height?: number
}

export function ChartCard({ title, subtitle, loading, className, children, action, height = 220 }: ChartCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card shadow-card p-5 space-y-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {loading ? (
        <div style={{ height }} className="flex items-end gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1" style={{ height: `${40 + Math.random() * 60}%` }}>
              <Skeleton className="w-full h-full rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ height }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ── AI Usage Area Chart ───────────────────────────────────────────────────────
export interface AIUsageData {
  date: string
  generations: number
  tokens: number
}

export function AIUsageChart({ data, loading }: { data: AIUsageData[]; loading?: boolean }) {
  return (
    <ChartCard title="AI Usage" subtitle="Daily generations & tokens (K)" loading={loading} height={200}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gen-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={PRIMARY} stopOpacity={0.3} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE()} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="generations" name="Generations" stroke={PRIMARY} fill="url(#gen-grad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Documents Bar Chart ───────────────────────────────────────────────────────
export interface DocTypeData {
  type: string
  count: number
}

export function DocumentsBarChart({ data, loading }: { data: DocTypeData[]; loading?: boolean }) {
  return (
    <ChartCard title="Documents by Type" loading={loading} height={200}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE()} vertical={false} />
          <XAxis dataKey="type" tick={{ fontSize: 10, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Weekly Activity Line Chart ────────────────────────────────────────────────
export interface WeeklyActivityData {
  day: string
  documents: number
  aiGenerations: number
}

export function WeeklyActivityChart({ data, loading }: { data: WeeklyActivityData[]; loading?: boolean }) {
  return (
    <ChartCard title="Weekly Activity" subtitle="Documents created vs AI generations" loading={loading} height={200}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE()} />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: MUTED_TEXT() }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey="documents" name="Documents" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="aiGenerations" name="AI Generations" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Module Distribution Pie Chart ─────────────────────────────────────────────
export interface ModuleDistData {
  name: string
  value: number
}

export function ModuleDistributionChart({ data, loading }: { data: ModuleDistData[]; loading?: boolean }) {
  return (
    <ChartCard title="AI Module Usage" subtitle="Breakdown by module type" loading={loading} height={200}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${Number(v)} uses`} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value) => <span style={{ color: MUTED_TEXT() }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

// ── Storage Usage Widget ──────────────────────────────────────────────────────
interface StorageSegment { label: string; size: number; color: string }

export function StorageWidget({ used, total, segments, loading }: {
  used: number; total: number; segments: StorageSegment[]; loading?: boolean
}) {
  const pct = Math.round((used / total) * 100)

  return (
    <div className="rounded-xl border bg-card shadow-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Storage Usage</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{used.toFixed(1)} GB of {total} GB used</p>
      </div>
      {loading ? (
        <Skeleton className="h-3 w-full rounded-full" />
      ) : (
        <>
          {/* Segmented progress bar */}
          <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-muted gap-px">
            {segments.map((seg) => {
              const segPct = (seg.size / total) * 100
              return <div key={seg.label} style={{ width: `${segPct}%`, background: seg.color }} title={`${seg.label}: ${seg.size.toFixed(1)} GB`} />
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-1.5">
            {segments.map((seg) => (
              <div key={seg.label} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full shrink-0" style={{ background: seg.color }} />
                <span className="text-xs text-muted-foreground truncate">{seg.label}</span>
                <span className="ml-auto text-xs text-foreground tabular-nums">{seg.size.toFixed(1)}G</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{pct}% used</span>
            <button type="button" className="text-primary hover:underline">Manage storage</button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Productivity Score Widget ─────────────────────────────────────────────────
export function ProductivityWidget({ score, trend, loading }: {
  score: number; trend: number; loading?: boolean
}) {
  const RADIUS = 54
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const strokeDash = (score / 100) * CIRCUMFERENCE

  return (
    <div className="rounded-xl border bg-card shadow-card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Productivity Score</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Based on activity this week</p>
      </div>
      {loading ? (
        <Skeleton className="h-32 w-32 mx-auto rounded-full" />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <svg width="128" height="128" viewBox="0 0 128 128" aria-label={`Productivity score: ${score}%`}>
            <circle cx="64" cy="64" r={RADIUS} stroke={GRID_STROKE()} strokeWidth="10" fill="none" />
            <circle
              cx="64" cy="64" r={RADIUS}
              stroke={PRIMARY}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform="rotate(-90 64 64)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <text x="64" y="60" textAnchor="middle" className="fill-foreground" style={{ fontSize: '22px', fontWeight: 700, fill: 'var(--foreground)' }}>{score}</text>
            <text x="64" y="76" textAnchor="middle" style={{ fontSize: '11px', fill: MUTED_TEXT() }}>/ 100</text>
          </svg>
          <div className={cn('flex items-center gap-1 text-xs font-medium', trend >= 0 ? 'text-success' : 'text-error')}>
            <span>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span>
            <span className="text-muted-foreground font-normal">vs last week</span>
          </div>
        </div>
      )}
    </div>
  )
}
