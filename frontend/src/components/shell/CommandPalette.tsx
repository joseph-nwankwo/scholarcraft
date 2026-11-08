import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, GraduationCap,
  ClipboardList, Calendar, Settings, CreditCard,
  type LucideIcon,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { useCommandPalette } from '@/contexts/CommandPaletteContext'
import { ROUTES } from '@/constants/routes'

interface CmdItem {
  id: string
  label: string
  icon: LucideIcon
  action: () => void
  shortcut?: string
  group: string
}

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette()
  const navigate = useNavigate()

  function go(href: string) {
    navigate(href)
    setOpen(false)
  }

  const commands: CmdItem[] = [
    // Navigate
    { id: 'nav-dashboard',       label: 'Dashboard',        icon: LayoutDashboard, action: () => go(ROUTES.DASHBOARD),        shortcut: '⌘D', group: 'Navigate' },
    { id: 'nav-study-tools',     label: 'Study Tools',      icon: BookOpen,        action: () => go(ROUTES.STUDY_TOOLS),      shortcut: '⌘S', group: 'Navigate' },
    { id: 'nav-study-planner',   label: 'Study Planner',    icon: Calendar,        action: () => go(ROUTES.STUDY_PLANNER),                    group: 'Navigate' },
    { id: 'nav-class-connect',   label: 'Class Connect',    icon: GraduationCap,   action: () => go(ROUTES.CLASS_CONNECT),                    group: 'Navigate' },
    { id: 'nav-submissions',     label: 'Submissions',      icon: ClipboardList,   action: () => go(ROUTES.SUBMISSIONS),                      group: 'Navigate' },
    { id: 'nav-plagiarism',      label: 'Plagiarism Check', icon: FileText,        action: () => go(ROUTES.PLAGIARISM_CHECK),                 group: 'Navigate' },
    // ThesisCraft
    { id: 'thesis-home',         label: 'ThesisCraft',          icon: FileText,    action: () => go(ROUTES.THESISCRAFT),                      group: 'ThesisCraft' },
    { id: 'thesis-proposal',     label: 'Thesis Proposal',      icon: FileText,    action: () => go(ROUTES.THESISCRAFT_PROPOSAL),             group: 'ThesisCraft' },
    { id: 'thesis-chapters',     label: 'Thesis Chapters',      icon: BookOpen,    action: () => go(ROUTES.THESISCRAFT_CHAPTERS),             group: 'ThesisCraft' },
    { id: 'thesis-citations',    label: 'Thesis Citations',     icon: BookOpen,    action: () => go(ROUTES.THESISCRAFT_CITATIONS),            group: 'ThesisCraft' },
    // Account
    { id: 'nav-settings',        label: 'Settings',         icon: Settings,        action: () => go(ROUTES.SETTINGS),         shortcut: '⌘,', group: 'Account' },
    { id: 'nav-billing',         label: 'Billing',          icon: CreditCard,      action: () => go(ROUTES.BILLING),                          group: 'Account' },
  ]

  const groups = [...new Set(commands.map((c) => c.group))]

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, documents…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group, i) => (
          <div key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {commands.filter((c) => c.group === group).map((cmd) => {
                const Icon = cmd.icon
                return (
                  <CommandItem key={cmd.id} value={cmd.label} onSelect={cmd.action} className="gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="pointer-events-none text-[10px] text-muted-foreground font-mono">{cmd.shortcut}</kbd>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
