import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, Mail, ArrowLeft } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setError('')
    setIsLoading(true)
    try {
      await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-[380px] space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link to={ROUTES.SIGN_IN} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">LectureCraft</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          {!sent ? (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send a reset link if an account exists.
                </p>
              </div>

              {error && <Alert variant="error" description={error} />}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <TextField
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@institution.edu"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                />
                <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Sending…">
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive it?{' '}
                <button type="button" onClick={() => setSent(false)} className="text-primary hover:underline">
                  Try again
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center">
          <Link
            to={ROUTES.SIGN_IN}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
