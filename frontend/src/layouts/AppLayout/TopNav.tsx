import {
  Bell, Plus, ChevronDown, Menu, User, Settings, LogOut,
  CreditCard, Monitor, Moon, Sun, HelpCircle, ExternalLink,
  Sparkles, BookOpen, ShieldCheck, GraduationCap, Users,
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
import { useNavigate } from 'react-router-dom'

const NAVY = '#0B1E3D'
const GOLD = '#C9A227'

function useGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function TopNav() {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toggleMobile } = useSidebar()
  const { setOpen: openPalette } = useCommandPalette()
  const navigate = useNavigate()
  const greeting = useGreeting()

  const unreadCount = 3 // TODO: fetch from API
  const isOnline = navigator.onLine

  const initials = user
    ? (user.name ?? user.email ?? '')
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 7, background: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', color: '#fff',
    flexShrink: 0, transition: 'background 0.15s',
  }

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 56, flexShrink: 0, padding: '0 20px',
      background: NAVY, borderBottom: `3px solid ${GOLD}`,
      fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
      position: 'sticky', top: 0, zIndex: 40,
    }}>

      {/* Left: mobile hamburger + brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Hamburger — only visible on mobile when sidebar is hidden */}
        <button
          type="button"
          onClick={toggleMobile}
          className="flex md:hidden"
          style={{ ...iconBtn, border: 'none', display: undefined }}
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>

        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
            Scholar<span style={{ color: GOLD }}>Craft</span>
          </span>
          <span className="hidden sm:block" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: GOLD, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 2 }}>
            UAMSATECH · CRAFT SUITE
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Command palette search — desktop */}
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="hidden md:flex"
          style={{
            height: 32, alignItems: 'center', gap: 8, borderRadius: 7,
            border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
            padding: '0 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
          }}
          aria-label="Open command palette"
        >
          Search anything…
          <kbd style={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(0,0,0,0.2)', padding: '0 5px', fontFamily: 'inherit', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
            ⌘K
          </kbd>
        </button>

        {/* AI Generate */}
        <button
          type="button"
          onClick={() => navigate(ROUTES.STUDY_TOOLS)}
          className="hidden sm:flex"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 32,
            padding: '0 14px', borderRadius: 7, border: 'none',
            background: '#0B1E3D', cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
            color: '#fff', fontWeight: 600,
          }}
        >
          <Sparkles size={13} />
          <span className="hidden md:block">Generate</span>
        </button>

        {/* Quick Create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={iconBtn} aria-label="Quick create">
              <Plus size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(ROUTES.STUDY_TOOLS)}>
              <BookOpen className="mr-2 h-4 w-4" />Study Tools
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.PLAGIARISM_CHECK)}>
              <ShieldCheck className="mr-2 h-4 w-4" />Plagiarism & AI Check
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.THESISCRAFT)}>
              <GraduationCap className="mr-2 h-4 w-4" />ThesisCraft
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.CLASS_CONNECT)}>
              <Users className="mr-2 h-4 w-4" />Class Connect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={{ ...iconBtn, position: 'relative' }} aria-label={`${unreadCount} notifications`}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 16, height: 16, borderRadius: '50%',
                  background: GOLD, color: NAVY,
                  fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
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
                { id: '1', title: 'Plagiarism Check Complete', desc: 'Your thesis draft scored 96% original.', time: '2m ago', unread: true },
                { id: '2', title: 'Class Invitation', desc: 'You were added to CS 301 — Data Structures.', time: '15m ago', unread: true },
                { id: '3', title: 'Study Reminder', desc: 'Your flashcard deck "Organic Chemistry" is due for review.', time: '1h ago', unread: true },
              ].map((n) => (
                <div key={n.id} className={cn('flex gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer', n.unread && 'bg-primary/5')}>
                  <div className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', n.unread ? 'bg-primary' : 'bg-transparent')} />
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
        <span className="hidden lg:flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? '#22c55e' : '#ef4444' }} />
          {isOnline ? 'Online' : 'Offline'}
        </span>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 7, padding: '3px 6px 3px 3px', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl ?? undefined} />
                <AvatarFallback style={{ fontSize: 11, background: `${GOLD}25`, color: GOLD, fontWeight: 700 }}>{initials}</AvatarFallback>
              </Avatar>
              <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.5)' }} className="hidden sm:block" />
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
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS_PROFILE)}>
              <User className="mr-2 h-4 w-4" />Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.SETTINGS)}>
              <Settings className="mr-2 h-4 w-4" />Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(ROUTES.BILLING)}>
              <CreditCard className="mr-2 h-4 w-4" />Billing
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