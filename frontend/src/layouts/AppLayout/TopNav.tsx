import { Link, useLocation } from 'react-router-dom'
import {
  Bell, Plus, ChevronDown, Menu, User, Settings, LogOut,
  CreditCard, Key, Monitor, Moon, Sun, HelpCircle, ExternalLink,
  Sparkles, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { useSidebar } from '@/contexts/SidebarContext'
import { useCommandPalette } from '@/contexts/CommandPaletteContext'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/design-system/buttons/Button'
import { useNavigate } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/courses': 'Courses',
  '/lecture-notes': 'Lecture Notes',
  '/teaching-assistant': 'Teaching Assistant',
  '/ai-studio': 'AI Studio',
  '/question-generator': 'Question Generator',
  '/assignment-generator': 'Assignment Generator',
  '/exam-builder': 'Exam Builder',
  '/rubric-generator': 'Rubric Generator',
  '/course-outline': 'Course Outline',
  '/powerpoint-generator': 'Presentation AI',
  '/research-assistant': 'Research Assistant',
  '/document-library': 'Document Library',
  '/exports': 'Exports',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

function useGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  const crumbs = segments.reduce<{ label: string; href: string }[]>((acc, seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = routeLabels[href] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ')
    acc.push({ label, href })
    return acc
  }, [])

  if (crumbs.length <= 1) {
    return <span className="text-sm font-semibold text-foreground">{crumbs[0]?.label ?? 'Dashboard'}</span>
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden />}
              {isLast ? (
                <span className="font-semibold text-foreground" aria-current="page">{crumb.label}</span>
              ) : (
                <Link to={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">{crumb.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function TopNav() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { openMobile } = useSidebar()
  const { setOpen: openPalette } = useCommandPalette()
  const navigate = useNavigate()
  const greeting = useGreeting()

  const unreadCount = 3 // TODO: fetch from API
  const isOnline = navigator.onLine

  const initials = user
    ? ((user as unknown as { name?: string }).name ?? user.email ?? '')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const today = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 backdrop-blur-sm px-4 z-20">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={openMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Date */}
        <span className="hidden xl:block text-xs text-muted-foreground mr-1 tabular-nums">{today}</span>

        {/* Global search trigger */}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="hidden sm:flex h-8 items-center gap-2 rounded-lg border border-input bg-muted/50 px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Open command palette"
        >
          <span className="hidden md:block">Search anything…</span>
          <kbd className="pointer-events-none rounded border border-border bg-background px-1 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
        </button>

        {/* AI Quick Action */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          onClick={() => navigate(ROUTES.AI_STUDIO)}
          className="hidden sm:flex"
        >
          <span className="hidden md:block">Generate</span>
        </Button>

        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Quick create"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.COURSES + '/new')}>New Course</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.LECTURE_NOTES + '/generate')}>Generate Lecture Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.QUESTION_GENERATOR)}>Generate Questions</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.ASSIGNMENT_GENERATOR)}>Create Assignment</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.EXAM_BUILDER)}>Build Exam</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.AI_STUDIO)}>AI Studio</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label={`${unreadCount} unread notifications`}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <span className="text-sm font-semibold">Notifications</span>
              <button type="button" className="text-xs text-primary hover:underline">Mark all read</button>
            </div>
            <div className="divide-y max-h-72 overflow-y-auto">
              {[
                { id: '1', title: 'AI Generation Complete', desc: 'Your lecture note for CS 101 is ready.', time: '2m ago', unread: true },
                { id: '2', title: 'Export Finished', desc: 'Assignment PDF downloaded successfully.', time: '15m ago', unread: true },
                { id: '3', title: 'New Course Created', desc: 'Introduction to Data Science added.', time: '1h ago', unread: true },
              ].map((n) => (
                <div key={n.id} className={cn('flex gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer', n.unread && 'bg-primary/3')}>
                  <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'bg-transparent')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.desc}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-2">
              <button type="button" className="w-full rounded-lg py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors">
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Online indicator */}
        <span className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-success' : 'bg-error')} />
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-muted transition-colors"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{greeting}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <User className="mr-2 h-4 w-4" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Settings className="mr-2 h-4 w-4" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <CreditCard className="mr-2 h-4 w-4" />Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Key className="mr-2 h-4 w-4" />API Keys
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {theme === 'dark' ? <Moon className="mr-2 h-4 w-4" /> : theme === 'light' ? <Sun className="mr-2 h-4 w-4" /> : <Monitor className="mr-2 h-4 w-4" />}
                Appearance
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme('light')} className={theme === 'light' ? 'text-primary font-medium' : ''}>
                  <Sun className="mr-2 h-4 w-4" />Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className={theme === 'dark' ? 'text-primary font-medium' : ''}>
                  <Moon className="mr-2 h-4 w-4" />Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className={theme === 'system' ? 'text-primary font-medium' : ''}>
                  <Monitor className="mr-2 h-4 w-4" />System
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem>
              <HelpCircle className="mr-2 h-4 w-4" />Help & Support
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-error focus:text-error focus:bg-error-muted">
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
