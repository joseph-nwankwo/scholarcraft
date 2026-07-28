import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, FileText, GraduationCap, Sparkles,
  HelpCircle, ClipboardList, Award, CheckSquare, List, Presentation,
  FlaskConical, FolderOpen, Download, BarChart2, Settings, Plus,
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
    // Navigation
    { id: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => go(ROUTES.DASHBOARD), shortcut: '⌘D', group: 'Navigate' },
    { id: 'nav-courses', label: 'Courses', icon: BookOpen, action: () => go(ROUTES.COURSES), shortcut: '⌘C', group: 'Navigate' },
    { id: 'nav-docs', label: 'Document Library', icon: FolderOpen, action: () => go(ROUTES.DOCUMENT_LIBRARY), group: 'Navigate' },
    { id: 'nav-analytics', label: 'Analytics', icon: BarChart2, action: () => go(ROUTES.ANALYTICS), group: 'Navigate' },
    { id: 'nav-settings', label: 'Settings', icon: Settings, action: () => go(ROUTES.SETTINGS), shortcut: '⌘,', group: 'Navigate' },
    // Create
    { id: 'create-course', label: 'Create New Course', icon: Plus, action: () => go(ROUTES.COURSE_CREATE), group: 'Create' },
    { id: 'create-lecture', label: 'Generate Lecture Note', icon: FileText, action: () => go(ROUTES.LECTURE_NOTE_GENERATE), group: 'Create' },
    { id: 'create-questions', label: 'Generate Questions', icon: HelpCircle, action: () => go(ROUTES.QUESTION_GENERATOR), group: 'Create' },
    { id: 'create-assignment', label: 'Create Assignment', icon: ClipboardList, action: () => go(ROUTES.ASSIGNMENT_GENERATOR), group: 'Create' },
    { id: 'create-exam', label: 'Build Exam', icon: Award, action: () => go(ROUTES.EXAM_BUILDER), group: 'Create' },
    { id: 'create-rubric', label: 'Generate Rubric', icon: CheckSquare, action: () => go(ROUTES.RUBRIC_GENERATOR), group: 'Create' },
    { id: 'create-outline', label: 'Create Course Outline', icon: List, action: () => go(ROUTES.COURSE_OUTLINE), group: 'Create' },
    { id: 'create-ppt', label: 'Generate Presentation', icon: Presentation, action: () => go(ROUTES.POWERPOINT_GENERATOR), group: 'Create' },
    // AI
    { id: 'ai-studio', label: 'Open AI Studio', icon: Sparkles, action: () => go(ROUTES.AI_STUDIO), shortcut: '⌘A', group: 'AI Tools' },
    { id: 'ai-teaching', label: 'Teaching Assistant', icon: GraduationCap, action: () => go(ROUTES.TEACHING_ASSISTANT), group: 'AI Tools' },
    { id: 'ai-research', label: 'Research Assistant', icon: FlaskConical, action: () => go(ROUTES.RESEARCH_ASSISTANT), group: 'AI Tools' },
    // Misc
    { id: 'exports', label: 'Exports', icon: Download, action: () => go(ROUTES.EXPORTS), group: 'Content' },
    { id: 'lecture-notes', label: 'Lecture Notes', icon: FileText, action: () => go(ROUTES.LECTURE_NOTES), group: 'Content' },
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
