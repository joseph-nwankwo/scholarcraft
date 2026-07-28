import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarClock, BookOpen, ShieldCheck, GraduationCap, Users,
  Settings, ChevronRight, ChevronsLeft,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useSidebar } from '@/contexts/SidebarContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
  shortcut?: string
  badge?: string
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    id: 'main',
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard, shortcut: '⌘D' },
    ],
  },
  {
    id: 'planning',
    title: 'Planning',
    items: [
      { id: 'study-planner', label: 'Study Planner', href: ROUTES.STUDY_PLANNER, icon: CalendarClock },
    ],
  },
  {
    id: 'tools',
    title: 'AI Tools',
    items: [
      { id: 'study-tools',     label: 'Study Tools',          href: ROUTES.STUDY_TOOLS,     icon: BookOpen },
      { id: 'plagiarism-check',label: 'Plagiarism & AI Check', href: ROUTES.PLAGIARISM_CHECK, icon: ShieldCheck },
      { id: 'thesiscraft',     label: 'ThesisCraft',          href: ROUTES.THESISCRAFT,     icon: GraduationCap },
    ],
  },
  {
    id: 'class',
    title: 'Class',
    items: [
      { id: 'class-connect', label: 'Class Connect', href: ROUTES.CLASS_CONNECT, icon: Users },
    ],
  },
  {
    id: 'system',
    title: 'System',
    items: [
      { id: 'settings', label: 'Settings', href: ROUTES.SETTINGS, icon: Settings, shortcut: '⌘,' },
    ],
  },
]

// ── Brand mark ────────────────────────────────────────────────────────────────
function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5 px-4 py-4 border-b border-border', collapsed && 'justify-center px-2')}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm select-none">
        SC
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-none">ScholarCraft</p>
          <p className="text-[10px] text-muted-foreground">by UAMSATech</p>
        </div>
      )}
    </div>
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItemRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const content = (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )
      }
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded px-1.5 py-0.5">
          {item.badge}
        </span>
      )}
      {!collapsed && item.shortcut && (
        <span className="text-[10px] text-muted-foreground/50 hidden lg:block">{item.shortcut}</span>
      )}
    </NavLink>
  )

  if (!collapsed) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
    </Tooltip>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { collapsed, setCollapsed } = useSidebar()
  const [hovering, setHovering] = useState(false)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-card transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56',
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <BrandMark collapsed={collapsed} />

      <ScrollArea className="flex-1 py-3 px-2">
        {NAV.map((section) => (
          <div key={section.id} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemRow key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </ScrollArea>

      {/* Collapse toggle */}
      {(hovering || collapsed) && (
        <div className="border-t border-border p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
    </aside>
  )
}
