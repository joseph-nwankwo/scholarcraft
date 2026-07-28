import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Check } from 'lucide-react'
import { authApi } from '@/lib/api/auth.api'
import { useAuth } from '@/app/providers/AuthProvider'
import { TextField } from '@/components/design-system/inputs/TextField'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

interface FormData {
  name: string
  email: string
  matricNumber: string
  password: string
  confirm: string
}

const defaultForm: FormData = { name: '', email: '', matricNumber: '', password: '', confirm: '' }

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters',    ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Number',           ok: /[0-9]/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const color =
    score === 0 ? 'bg-muted'
    : score === 1 ? 'bg-red-500'
    : score === 2 ? 'bg-amber-500'
    : 'bg-green-500'

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? color : 'bg-muted')} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, ok }) => (
          <span
            key={label}
            className={cn('flex items-center gap-1 text-xs', ok ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground')}
          >
            <Check className={cn('h-3 w-3', ok ? 'opacity-100' : 'opacity-0')} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SignUpPage() {
  const { login }     = useAuth()
  const navigate      = useNavigate()
  const [form,       setForm]       = useState<FormData>(defaultForm)
  const [error,      setError]      = useState('')
  const [isLoading,  setIsLoading]  = useState(false)

  function upd(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  function validate() {
    if (!form.name.trim()) { setError('Full name is required'); return false }
    if (!form.email.includes('@')) { setError('Valid email required'); return false }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return false }
    if (!/[A-Z]/.test(form.password)) { setError('Password must contain an uppercase letter'); return false }
    if (!/[0-9]/.test(form.password)) { setError('Password must contain a number'); return false }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return false }
    setError(''); return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)
    setError('')
    try {
      await authApi.register({
        name:         form.name,
        email:        form.email,
        password:     form.password,
        role:         'STUDENT',
        ...(form.matricNumber.trim() ? { matricNumber: form.matricNumber.trim() } : {}),
      })
      await login(form.email, form.password)
      navigate(ROUTES.DASHBOARD, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-108 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link to={ROUTES.SIGN_IN} className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold">ScholarCraft</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plagiarism checks, study tools, and thesis help — all in one place</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
          {error && <Alert variant="error" description={error} />}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <TextField
              label="Full name"
              value={form.name}
              onChange={upd('name')}
              placeholder="Ada Okonkwo"
              required
              disabled={isLoading}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={upd('email')}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={isLoading}
            />
            <TextField
              label="Matric / Student number (optional)"
              value={form.matricNumber}
              onChange={upd('matricNumber')}
              placeholder="e.g. 190401234"
              disabled={isLoading}
            />
            <div>
              <PasswordField
                label="Password"
                value={form.password}
                onChange={upd('password')}
                autoComplete="new-password"
                required
                disabled={isLoading}
              />
              {form.password && <PasswordStrength password={form.password} />}
            </div>
            <PasswordField
              label="Confirm password"
              value={form.confirm}
              onChange={upd('confirm')}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
            <Button type="submit" variant="primary" fullWidth loading={isLoading} loadingText="Creating account…">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.SIGN_IN} className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
