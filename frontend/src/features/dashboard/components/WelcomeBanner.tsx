import { Sparkles, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES } from '@/constants/routes'

interface WelcomeBannerProps {
  name?: string
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function WelcomeBanner({ name }: WelcomeBannerProps) {
  const navigate = useNavigate()
  const greeting = getGreeting()
  const displayName = name?.split(' ')[0] ?? 'Professor'
  const dayMsg = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-primary/70 p-6 text-primary-foreground shadow-md">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-10 -right-4 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute left-1/2 top-0 h-px w-1/2 bg-white/10" />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-primary-foreground/70 font-medium">{dayMsg}</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {displayName}!
          </h1>
          <p className="text-sm text-primary-foreground/80 max-w-md">
            Your AI-powered teaching assistant is ready. Generate academic content, manage courses, and accelerate your workflow.
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 sm:items-end">
          <Button
            onClick={() => navigate(ROUTES.AI_STUDIO)}
            className="bg-white text-primary hover:bg-white/90 shadow-sm border-0 font-semibold"
            leftIcon={<Sparkles className="h-4 w-4" />}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Open AI Studio
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(ROUTES.COURSES + '/new')}
            className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
          >
            Create a Course
          </Button>
        </div>
      </div>
    </div>
  )
}
