import { type ReactNode } from 'react'
import {
  ResponsiveContainer,
  LineChart as RCLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart as RCBar, Bar,
  AreaChart as RCArea, Area,
  PieChart as RCPie, Pie, Cell,
  RadarChart as RCRadar, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

// ── Palette ──────────────────────────────────────────────────────────────────
export const PALETTE = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316']

// ── Generic types ────────────────────────────────────────────────────────────
export interface ChartProps<T = Record<string, unknown>> {
  data: T[]
  height?: number
  className?: string
}

// ── Shared formatting ─────────────────────────────────────────────────────────
const tickStyle = { fontSize: 11, fill: 'hsl(var(--muted-foreground, 220 8% 46%))' }

// ── LineChart ─────────────────────────────────────────────────────────────────
export function LineChart({ data, dataKey, xKey = 'date', label, color = PALETTE[0], height = 220, className }: {
  data: Record<string, unknown>[]; dataKey: string; xKey?: string
  label?: string; color?: string; height?: number; className?: string
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCLine data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border, 220 13% 90%))" />
          <XAxis dataKey={xKey} tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
          {label && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} name={label ?? dataKey} />
        </RCLine>
      </ResponsiveContainer>
    </div>
  )
}

// ── MultiLineChart ────────────────────────────────────────────────────────────
export function MultiLineChart({ data, lines, xKey = 'date', height = 220, className }: {
  data: Record<string, unknown>[]; xKey?: string; height?: number; className?: string
  lines: Array<{ key: string; label?: string; color?: string }>
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCLine data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border, 220 13% 90%))" />
          <XAxis dataKey={xKey} tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {lines.map((l, i) => (
            <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={2} dot={false} name={l.label ?? l.key} />
          ))}
        </RCLine>
      </ResponsiveContainer>
    </div>
  )
}

// ── AreaChart ─────────────────────────────────────────────────────────────────
export function AreaChart({ data, dataKey, xKey = 'date', label, color = PALETTE[0], height = 200, className }: {
  data: Record<string, unknown>[]; dataKey: string; xKey?: string
  label?: string; color?: string; height?: number; className?: string
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCArea data={data}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border, 220 13% 90%))" />
          <XAxis dataKey={xKey} tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          {label && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2}
            fill={`url(#grad-${dataKey})`} name={label ?? dataKey} />
        </RCArea>
      </ResponsiveContainer>
    </div>
  )
}

// ── BarChart ──────────────────────────────────────────────────────────────────
export function BarChart({ data, dataKey, xKey = 'name', label, color = PALETTE[0], height = 220, horizontal = false, className }: {
  data: Record<string, unknown>[]; dataKey: string; xKey?: string
  label?: string; color?: string; height?: number; horizontal?: boolean; className?: string
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCBar data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border, 220 13% 90%))" />
          {horizontal
            ? <><YAxis dataKey={xKey} type="category" tick={tickStyle} tickLine={false} axisLine={false} width={80} />
                <XAxis type="number" tick={tickStyle} tickLine={false} axisLine={false} /></>
            : <><XAxis dataKey={xKey} tick={tickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} /></>
          }
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          {label && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Bar dataKey={dataKey} fill={color} name={label ?? dataKey} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </RCBar>
      </ResponsiveContainer>
    </div>
  )
}

// ── MultiBarChart ─────────────────────────────────────────────────────────────
export function MultiBarChart({ data, bars, xKey = 'name', height = 220, stacked = false, className }: {
  data: Record<string, unknown>[]; xKey?: string; height?: number; stacked?: boolean; className?: string
  bars: Array<{ key: string; label?: string; color?: string }>
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCBar data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border, 220 13% 90%))" />
          <XAxis dataKey={xKey} tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={36} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} fill={b.color ?? PALETTE[i % PALETTE.length]}
              name={b.label ?? b.key} stackId={stacked ? 'stack' : undefined}
              radius={stacked ? undefined : [4, 4, 0, 0]} maxBarSize={40} />
          ))}
        </RCBar>
      </ResponsiveContainer>
    </div>
  )
}

// ── PieChart ──────────────────────────────────────────────────────────────────
export function PieChart({ data, dataKey = 'count', nameKey = 'name', donut = false, height = 220, className }: {
  data: Record<string, unknown>[]; dataKey?: string; nameKey?: string
  donut?: boolean; height?: number; className?: string
}) {
  const innerRadius = donut ? '55%' : 0
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCPie>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%"
            innerRadius={innerRadius} outerRadius="75%" paddingAngle={2}
            label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
            labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RCPie>
      </ResponsiveContainer>
    </div>
  )
}

// ── RadarChart ────────────────────────────────────────────────────────────────
export function RadarChart({ data, dataKey = 'value', angleKey = 'subject', color = PALETTE[0], height = 260, className }: {
  data: Record<string, unknown>[]; dataKey?: string; angleKey?: string
  color?: string; height?: number; className?: string
}) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RCRadar data={data}>
          <PolarGrid stroke="hsl(var(--border, 220 13% 90%))" />
          <PolarAngleAxis dataKey={angleKey} tick={{ ...tickStyle, fontSize: 10 }} />
          <PolarRadiusAxis tick={{ ...tickStyle, fontSize: 9 }} axisLine={false} />
          <Radar dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.15} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        </RCRadar>
      </ResponsiveContainer>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, color = 'default', icon }: {
  label: string; value: string | number; sub?: string
  trend?: { value: number; label: string }
  color?: 'default' | 'green' | 'blue' | 'amber' | 'red' | 'purple'
  icon?: ReactNode
}) {
  const colorMap = {
    default: 'border-border', green: 'border-green-200', blue: 'border-blue-200',
    amber: 'border-amber-200', red: 'border-red-200', purple: 'border-purple-200',
  }
  const bg = {
    default: '', green: 'bg-green-50', blue: 'bg-blue-50',
    amber: 'bg-amber-50', red: 'bg-red-50', purple: 'bg-purple-50',
  }
  return (
    <div className={`bg-card border ${colorMap[color]} ${bg[color]} rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span className="text-muted-foreground font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ── DateRangePicker ───────────────────────────────────────────────────────────
export function DateRangePicker({ from, to, onChange }: {
  from: string; to: string; onChange: (from: string, to: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-muted-foreground shrink-0">From</label>
      <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)}
        className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none" />
      <label className="text-xs text-muted-foreground shrink-0">To</label>
      <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)}
        className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none" />
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, label, color = '#6366f1' }: {
  value: number; max: number; label?: string; color?: string
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-foreground">{label}</span>
          <span className="text-xs text-muted-foreground">{value} / {max}</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
