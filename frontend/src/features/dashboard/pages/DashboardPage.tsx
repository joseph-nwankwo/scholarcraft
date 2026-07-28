import { Link } from 'react-router-dom'
import { BookOpen, ShieldCheck, GraduationCap, Users, ArrowRight } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { ROUTES } from '@/constants/routes'

const QUICK_LINKS = [
  {
    label: 'Study Tools',
    description: 'Flashcards, summarizer, and AI quiz practice',
    href: ROUTES.STUDY_TOOLS,
    icon: BookOpen,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    label: 'Plagiarism & AI Check',
    description: 'Check your work before submission',
    href: ROUTES.PLAGIARISM_CHECK,
    icon: ShieldCheck,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'ThesisCraft',
    description: 'Research support, proposals & chapter builder',
    href: ROUTES.THESISCRAFT,
    icon: GraduationCap,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    label: 'Class Connect',
    description: 'Join classes, access materials & submit assignments',
    href: ROUTES.CLASS_CONNECT,
    icon: Users,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.firstName ?? user?.name?.split(' ')[0] ?? 'Student'

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground mt-1">What would you like to work on today?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {QUICK_LINKS.map(({ label, description, href, icon: Icon, color }) => (
          <Link
            key={href}
            to={href}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-0.5" />
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Getting Started</h2>
        <ol className="space-y-3 text-sm text-foreground">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
            <span>Go to <strong>Settings → Branding</strong> to set your institution name and type</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
            <span>Use <strong>Plagiarism & AI Check</strong> to verify your work before submitting</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
            <span>Join a class via <strong>Class Connect</strong> using a code from your lecturer</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
            <span>Start your research with <strong>ThesisCraft</strong> — proposal builder & chapter planner</span>
          </li>
        </ol>
      </div>
    </div>
  )
}
