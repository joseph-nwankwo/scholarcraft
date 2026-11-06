import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

function PasswordStrengthBar({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0)
  const color = score === 0 ? 'bg-muted' : score === 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="flex gap-1 mt-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? color : 'bg-muted')} />
      ))}
    </div>
  )
}

export default function ResetPasswordPage() {
  const navigate          = useNavigate()
  const [params]          = useSearchParams()
  const token             = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!token) setError('Invalid or missing reset token. Please request a new link.')
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8)        { setError('Password must be at least 8 characters'); return }
    if (!/[A-Z]/.test(password))    { setError('Password must contain an uppercase letter'); return }
    if (!/[0-9]/.test(password))    { setError('Password must contain a number'); return }
    if (password !== confirm)        { setError('Passwords do not match'); return }

    setError('')
    setIsLoading(true)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Reset failed. The link may have expired.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-95 space-y-6">
        <div className="text-center">
          <Link to={ROUTES.SIGN_IN} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Lightbulb className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">ScholarCraft</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          {!done ? (
            <>
              <div className="space-y-1">
                <h1 className="text-xl font-bold tracking-tight">Set new password</h1>
                <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>

              {error && <Alert variant="error" description={error} />}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <PasswordField
                    label="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={isLoading || !token}
                  />
                  {password && <PasswordStrengthBar password={password} />}
                </div>
                <PasswordField
                  label="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={isLoading || !token}
                />
                <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Resetting…" disabled={!token}>
                  Reset password
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">Password reset!</h2>
                <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
              </div>
              <Button variant="primary" fullWidth onClick={() => navigate(ROUTES.SIGN_IN, { replace: true })}>
                Go to sign in
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
