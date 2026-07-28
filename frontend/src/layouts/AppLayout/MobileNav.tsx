import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarClock, BookOpen, ShieldCheck, GraduationCap, Users, Settings, X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useSidebar } from '@/contexts/SidebarContext'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MobileNavItem { label: string; href: string; icon: LucideIcon; badge?: string }
interface MobileNavSection { title: string; items: MobileNavItem[] }

const NAV: MobileNavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    ],
  },
  {
    title: 'Planning',
    items: [
      { label: 'Study Planner', href: ROUTES.STUDY_PLANNER, icon: CalendarClock },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      { label: 'Study Tools',          href: ROUTES.STUDY_TOOLS,     icon: BookOpen },
      { label: 'Plagiarism & AI Check',href: ROUTES.PLAGIARISM_CHECK, icon: ShieldCheck },
      { label: 'ThesisCraft',          href: ROUTES.THESISCRAFT,     icon: GraduationCap },
    ],
  },
  {
    title: 'Class',
    items: [
      { label: 'Class Connect', href: ROUTES.CLASS_CONNECT, icon: Users },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', href: ROUTES.SETTINGS, icon: Settings },
    ],
  },
]

export default function MobileNav() {
  const { mobileOpen, closeMobile } = useSidebar()
  const location = useLocation()

  useEffect(() => { closeMobile() }, [location.pathname, closeMobile])

  if (!mobileOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={closeMobile}
      />
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col md:hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              SC
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-none">ScholarCraft</p>
              <p className="text-[10px] text-muted-foreground">by UAMSATech</p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="flex-1 py-3 px-2">
          {NAV.map((section) => (
            <div key={section.title} className="mb-4">
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold bg-primary/15 text-primary rounded px-1.5 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </>
  )
}
