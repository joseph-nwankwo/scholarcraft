import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lightbulb, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES } from '@/constants/routes'

type Status = 'loading' | 'success' | 'error' | 'resent'

export default function VerifyEmailPage() {
  const [params]          = useSearchParams()
  const token             = params.get('token') ?? ''

  const [status,    setStatus]    = useState<Status>(token ? 'loading' : 'error')
  const [resending, setResending] = useState(false)
  const [resendEmail, setResendEmail] = useState('')

  const verify = useCallback(async () => {
    if (!token) return
    try {
      await authApi.verifyEmail(token)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }, [token])

  useEffect(() => { verify() }, [verify])

  async function handleResend() {
    if (!resendEmail.includes('@')) return
    setResending(true)
    try {
      await authApi.resendVerification(resendEmail)
      setStatus('resent')
    } catch {
      // silently fail (security: don't expose whether email is registered)
      setStatus('resent')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-[380px] space-y-6">
        <div className="text-center">
          <Link to={ROUTES.SIGN_IN} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">LectureCraft</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your email…</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-xl font-bold">Email verified!</h1>
                <p className="text-sm text-muted-foreground">Your account is now active. You can sign in.</p>
              </div>
              <Link to={ROUTES.SIGN_IN}>
                <Button variant="primary" fullWidth>Go to sign in</Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
                  <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold">Verification failed</h1>
                  <p className="text-sm text-muted-foreground">
                    This link is invalid or has expired. Request a new one below.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button variant="primary" fullWidth loading={resending} loadingText="Sending…" onClick={handleResend}>
                  Resend verification email
                </Button>
              </div>
            </div>
          )}

          {status === 'resent' && (
            <div className="text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                <Lightbulb className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">Check your inbox</h2>
                <p className="text-sm text-muted-foreground">
                  If that email is registered, a new verification link has been sent.
                </p>
              </div>
              <Link to={ROUTES.SIGN_IN} className="text-sm text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
