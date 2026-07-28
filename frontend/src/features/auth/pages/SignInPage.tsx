import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, ShieldCheck, BookOpen, Sparkles } from 'lucide-react'
import { useAuth } from '@/app/providers/AuthProvider'
import { TextField } from '@/components/design-system/inputs/TextField'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'

const FEATURES = [
  { icon: ShieldCheck, text: 'Check your work for plagiarism and AI writing' },
  { icon: BookOpen,    text: 'Study smarter with flashcards, summaries, and quizzes' },
  { icon: Sparkles,    text: 'Get AI help planning and writing your thesis' },
]

export default function SignInPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [error,     setError]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left branding panel (hidden on mobile) ───────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] shrink-0 flex-col justify-between bg-gradient-to-br from-slate-900 via-primary/90 to-slate-900 p-12 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">ScholarCraft</span>
        </div>

        {/* Headline */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-balance">
              Your AI Companion for Academic Success
            </h1>
            <p className="text-base text-white/70 leading-relaxed max-w-md text-balance">
              Plagiarism checks, study tools, and thesis writing help — built for students.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span className="text-sm text-white/80 leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <blockquote className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
          <p className="text-sm text-white/80 italic leading-relaxed">
            "ScholarCraft caught issues in my draft before submission and helped me structure my thesis proposal in a fraction of the time."
          </p>
          <footer className="mt-3 text-xs text-white/50 font-medium">
            Chidinma A. · Final-year student
          </footer>
        </blockquote>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold">ScholarCraft</span>
        </div>

        <div className="w-full max-w-[420px] space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your ScholarCraft account</p>
          </div>

          {error && <Alert variant="error" title="Sign-in failed" description={error} />}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <TextField
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
            <div>
              <PasswordField
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <div className="flex justify-end mt-1">
                <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Signing in…">
              Sign in
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to ScholarCraft?{' '}
            <Link to={ROUTES.SIGN_UP} className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
