import { useState, useEffect, useRef } from 'react'
import {
  User, Shield, Monitor, Bell, Building2, Sun, Moon, Settings2,
  ExternalLink, Globe, Package, Check, Camera, Loader2, ImageIcon, GraduationCap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { useTheme } from '@/app/providers/ThemeProvider'
import { authApi } from '@/lib/api/auth.api'
import { apiClient } from '@/lib/api/client'
import { TextField } from '@/components/design-system/inputs/TextField'
import { PasswordField } from '@/components/design-system/inputs/PasswordField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'
import { type InstitutionType, INSTITUTION_TYPE_LABELS } from '@/features/settings/pages/InstitutionSettingsPage'
import {
  type GradeBand,
  GRADE_SCALES,
  INSTITUTION_TYPE_OPTIONS,
  sortedBands,
  bandLabel,
  loadCustomBands,
  saveCustomBands,
} from '@/lib/grading'

const TABS = [
  { id: 'profile',       label: 'Profile',        icon: User },
  { id: 'security',      label: 'Security',       icon: Shield },
  { id: 'sessions',      label: 'Sessions',       icon: Monitor },
  { id: 'appearance',    label: 'Appearance',     icon: Settings2 },
  { id: 'notifications', label: 'Notifications',  icon: Bell },
  { id: 'branding',      label: 'Branding',       icon: ImageIcon },
  { id: 'grading',       label: 'Grading System', icon: GraduationCap },
  { id: 'institution',   label: 'Institution',    icon: Building2 },
] as const
type Tab = typeof TABS[number]['id']

// ── Avatar uploader ────────────────────────────────────────────────────────────
function AvatarUploader({ currentUrl, initials }: { currentUrl: string | null; initials: string }) {
  const { refreshUser } = useAuth()
  const fileRef   = useRef<HTMLInputElement>(null)
  const blobRef   = useRef<string | null>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function revokePendingBlob() {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current)
      blobRef.current = null
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 5 * 1024 * 1024)    { setError('Image must be under 5 MB'); return }
    setError('')

    revokePendingBlob()
    const localUrl = URL.createObjectURL(file)
    blobRef.current = localUrl
    setPreview(localUrl)
    setLoading(true)
    try {
      const { avatarUrl } = await authApi.uploadAvatar(file)
      // Blob stays until the server image successfully loads (handled in onLoad)
      setPreview(avatarUrl)
      await refreshUser()
    } catch {
      setError('Upload failed. Please try again.')
      setPreview(currentUrl)
      revokePendingBlob()
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border bg-primary/10 flex items-center justify-center">
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className="h-full w-full object-cover"
              onLoad={revokePendingBlob}
              onError={revokePendingBlob}
            />
          ) : (
            <span className="text-2xl font-bold text-primary">{initials}</span>
          )}
        </div>
        {loading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          aria-label="Change profile picture"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Profile photo</p>
        <p className="text-xs text-muted-foreground">JPEG, PNG, WEBP or GIF · Max 5 MB</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
      />
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, updateProfile } = useAuth()
  const [firstName,   setFirstName]  = useState(user?.firstName  ?? '')
  const [lastName,    setLastName]   = useState(user?.lastName   ?? '')
  const [title,       setTitle]      = useState(user?.title      ?? '')
  const [department,  setDepartment] = useState(user?.department ?? '')
  const [faculty,     setFaculty]    = useState(user?.faculty    ?? '')
  const [bio,         setBio]        = useState(user?.bio        ?? '')
  const [saving,      setSaving]     = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const initials = (firstName || user?.firstName || user?.name || '?')[0].toUpperCase()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await updateProfile({ firstName, lastName, title, department, faculty, bio })
      setMsg({ type: 'success', text: 'Profile updated successfully.' })
    } catch {
      setMsg({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-5">
      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} description={msg.text} />}

      <AvatarUploader currentUrl={user?.avatarUrl ?? null} initials={initials} />

      <div className="pt-1 border-t border-border">
        <div className="mb-3">
          <p className="font-semibold text-foreground">{user?.name}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Badge variant={user?.emailVerified ? 'success' : 'warning'} size="sm" className="mt-1">
            {user?.emailVerified ? 'Verified' : 'Email not verified'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={saving} />
        <TextField label="Last name"  value={lastName}  onChange={(e) => setLastName(e.target.value)}  disabled={saving} />
      </div>
      <TextField label="Title / Designation" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Professor, Dr., Lecturer" disabled={saving} />
      <TextField label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} disabled={saving} />
      <TextField label="Faculty"    value={faculty}    onChange={(e) => setFaculty(e.target.value)}    disabled={saving} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Bio</label>
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} disabled={saving}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-none"
          placeholder="A short bio about yourself…" />
      </div>
      <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">Save changes</Button>
    </form>
  )
}

// ── Security Tab ──────────────────────────────────────────────────────────────
function SecurityTab() {
  const [current, setCurrent] = useState('')
  const [next,    setNext]    = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleChange(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { setMsg({ type: 'error', text: 'New passwords do not match' }); return }
    if (next.length < 8)  { setMsg({ type: 'error', text: 'Password must be at least 8 characters' }); return }
    setSaving(true); setMsg(null)
    try {
      await authApi.changePassword(current, next)
      setMsg({ type: 'success', text: 'Password changed. You will be logged out of other sessions.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg({ type: 'error', text: m ?? 'Failed to change password.' })
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleChange} className="max-w-lg space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold">Change password</h3>
        <p className="text-sm text-muted-foreground">You will be signed out of all other sessions after changing.</p>
      </div>
      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} description={msg.text} />}
      <PasswordField label="Current password"     value={current} onChange={(e) => setCurrent(e.target.value)} required disabled={saving} />
      <PasswordField label="New password"         value={next}    onChange={(e) => setNext(e.target.value)}    required disabled={saving} autoComplete="new-password" />
      <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={saving} autoComplete="new-password" />
      <Button type="submit" variant="primary" loading={saving} loadingText="Updating…">Update password</Button>
    </form>
  )
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab() {
  type SessionRow = { id: string; userAgent?: string; ip?: string; createdAt?: string; lastUsedAt?: string }
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading,  setLoading]  = useState(false)
  const [loaded,   setLoaded]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { sessions: s } = await authApi.getSessions()
      setSessions(s as SessionRow[])
      setLoaded(true)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Active sessions</h3>
          <p className="text-sm text-muted-foreground">Devices currently signed in to your account</p>
        </div>
        {!loaded && <Button variant="outline" onClick={load} loading={loading} loadingText="Loading…">Load sessions</Button>}
        {loaded && sessions.length > 0 && (
          <Button variant="danger" size="sm" onClick={async () => {
            await authApi.terminateAllSessions(); setSessions([])
          }}>Sign out all</Button>
        )}
      </div>
      {loaded && sessions.length === 0 && <p className="text-sm text-muted-foreground">No active sessions found.</p>}
      {loaded && sessions.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{s.userAgent ?? 'Unknown device'}</p>
                <p className="text-xs text-muted-foreground">{s.ip ?? ''} · {s.lastUsedAt ?? s.createdAt ?? ''}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={async () => {
                await authApi.terminateSession(s.id)
                setSessions((prev) => prev.filter((x) => x.id !== s.id))
              }}>Terminate</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Appearance Tab ────────────────────────────────────────────────────────────
const FONT_SIZE_KEY = 'lecturecraft-font-size'
type FontSize = 'sm' | 'md' | 'lg'

function applyFontSize(size: FontSize) {
  document.documentElement.style.setProperty(
    '--app-font-size',
    size === 'sm' ? '14px' : size === 'lg' ? '17px' : '16px',
  )
}

function AppearanceTab() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [fontSize, setFontSizeState] = useState<FontSize>(
    () => (localStorage.getItem(FONT_SIZE_KEY) as FontSize | null) ?? 'md',
  )

  useEffect(() => { applyFontSize(fontSize) }, [fontSize])

  function changeFontSize(size: FontSize) {
    setFontSizeState(size)
    localStorage.setItem(FONT_SIZE_KEY, size)
  }

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]
  const fontOptions: Array<{ value: FontSize; label: string; desc: string }> = [
    { value: 'sm', label: 'Small',  desc: '14px' },
    { value: 'md', label: 'Medium', desc: '16px' },
    { value: 'lg', label: 'Large',  desc: '17px' },
  ]

  return (
    <div className="max-w-lg space-y-8">
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Theme</h3>
          <p className="text-sm text-muted-foreground">
            Currently using {resolvedTheme} mode{theme === 'system' ? ' (follows system)' : ''}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
                theme === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
              )}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
              {theme === value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Text size</h3>
          <p className="text-sm text-muted-foreground">Adjust the base font size across the app</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {fontOptions.map(({ value, label, desc }) => (
            <button key={value} type="button" onClick={() => changeFontSize(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-colors',
                fontSize === value
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground',
              )}>
              <span className={cn('font-semibold', value === 'sm' ? 'text-sm' : value === 'lg' ? 'text-lg' : 'text-base')}>Aa</span>
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
              {fontSize === value && <Check className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
const NOTIF_KEY = 'lecturecraft-notif-prefs'

interface NotifPrefs {
  email: {
    documentShared:   boolean
    approvalRequired: boolean
    approvalDecision: boolean
    newComment:       boolean
    aiGenComplete:    boolean
    weeklyDigest:     boolean
  }
  inApp: {
    documentShared:   boolean
    approvalRequired: boolean
    approvalDecision: boolean
    newComment:       boolean
    aiGenComplete:    boolean
  }
}

const DEFAULT_PREFS: NotifPrefs = {
  email: {
    documentShared:   true,
    approvalRequired: true,
    approvalDecision: true,
    newComment:       true,
    aiGenComplete:    false,
    weeklyDigest:     true,
  },
  inApp: {
    documentShared:   true,
    approvalRequired: true,
    approvalDecision: true,
    newComment:       true,
    aiGenComplete:    true,
  },
}

function loadNotifPrefs(): NotifPrefs {
  try {
    const s = localStorage.getItem(NOTIF_KEY)
    return s ? (JSON.parse(s) as NotifPrefs) : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-muted-foreground/30')}>
        <span className={cn('pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadNotifPrefs)
  const [saved, setSaved] = useState(false)

  function updateEmail(key: keyof NotifPrefs['email'], value: boolean) {
    setPrefs((p) => ({ ...p, email: { ...p.email, [key]: value } }))
    setSaved(false)
  }
  function updateInApp(key: keyof NotifPrefs['inApp'], value: boolean) {
    setPrefs((p) => ({ ...p, inApp: { ...p.inApp, [key]: value } }))
    setSaved(false)
  }

  function savePrefs() {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="font-semibold">Email notifications</h3>
        <p className="text-sm text-muted-foreground mb-2">Sent to your registered email address</p>
        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4">
            <ToggleRow label="Document shared with me"
              description="When someone shares a document with you"
              checked={prefs.email.documentShared}   onChange={(v) => updateEmail('documentShared', v)} />
            <ToggleRow label="Approval required"
              description="When a document needs your approval"
              checked={prefs.email.approvalRequired} onChange={(v) => updateEmail('approvalRequired', v)} />
            <ToggleRow label="Approval decision"
              description="When your approval request is acted upon"
              checked={prefs.email.approvalDecision} onChange={(v) => updateEmail('approvalDecision', v)} />
            <ToggleRow label="New comment"
              description="When someone comments on your document"
              checked={prefs.email.newComment}       onChange={(v) => updateEmail('newComment', v)} />
            <ToggleRow label="AI generation complete"
              description="When a long AI generation finishes"
              checked={prefs.email.aiGenComplete}    onChange={(v) => updateEmail('aiGenComplete', v)} />
            <ToggleRow label="Weekly activity digest"
              description="A weekly summary of your LectureCraft activity"
              checked={prefs.email.weeklyDigest}     onChange={(v) => updateEmail('weeklyDigest', v)} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-semibold">In-app notifications</h3>
        <p className="text-sm text-muted-foreground mb-2">Shown in the notification panel while you are signed in</p>
        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4">
            <ToggleRow label="Document shared with me"
              checked={prefs.inApp.documentShared}   onChange={(v) => updateInApp('documentShared', v)} />
            <ToggleRow label="Approval required"
              checked={prefs.inApp.approvalRequired} onChange={(v) => updateInApp('approvalRequired', v)} />
            <ToggleRow label="Approval decision"
              checked={prefs.inApp.approvalDecision} onChange={(v) => updateInApp('approvalDecision', v)} />
            <ToggleRow label="New comment"
              checked={prefs.inApp.newComment}       onChange={(v) => updateInApp('newComment', v)} />
            <ToggleRow label="AI generation complete"
              checked={prefs.inApp.aiGenComplete}    onChange={(v) => updateInApp('aiGenComplete', v)} />
          </div>
        </div>
      </div>

      <Button type="button" variant="primary" onClick={savePrefs}>
        {saved ? 'Saved!' : 'Save preferences'}
      </Button>
    </div>
  )
}

// ── Institution Tab ───────────────────────────────────────────────────────────
interface InstitutionSummary {
  name: string; abbreviation: string | null; domain: string | null
  subscriptionPlan: string; subscriptionStatus: string; country: string
  _count?: { users: number; courses: number }
}

const PLAN_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  FREE: 'default', STARTER: 'default', PROFESSIONAL: 'success', ENTERPRISE: 'success',
}
const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  TRIAL: 'warning', ACTIVE: 'success', EXPIRED: 'error', CANCELLED: 'error', SUSPENDED: 'error',
}

function InstitutionTab() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'university_admin' || user?.role === 'administrator'
  const [inst,    setInst]    = useState<InstitutionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    apiClient.get<{ institution: InstitutionSummary }>('/institutions')
      .then((r) => setInst(r.data.institution))
      .catch(() => setError('Could not load institution data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="max-w-lg space-y-3">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
    </div>
  )
  if (error) return <p className="text-sm text-error">{error}</p>
  if (!inst) return null

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{inst.name}</p>
          {inst.abbreviation && <p className="text-sm text-muted-foreground">{inst.abbreviation}</p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={PLAN_BADGE[inst.subscriptionPlan] ?? 'default'} size="sm">{inst.subscriptionPlan}</Badge>
            <Badge variant={STATUS_BADGE[inst.subscriptionStatus] ?? 'default'} size="sm">{inst.subscriptionStatus}</Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border">
        {([
          { icon: Globe,     label: 'Domain',  value: inst.domain  ?? '—' },
          { icon: Building2, label: 'Country', value: inst.country ?? '—' },
          { icon: Package,   label: 'Plan',    value: `${inst.subscriptionPlan} · ${inst.subscriptionStatus}` },
        ] as const).map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {inst._count && (
        <div className="grid grid-cols-2 gap-3">
          {([
            ['Users',   inst._count.users],
            ['Courses', inst._count.courses],
          ] as const).map(([label, count]) => (
            <div key={label} className="rounded-xl border border-border bg-muted/20 p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      {isAdmin ? (
        <Link to={ROUTES.SETTINGS_INSTITUTION}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors">
          <Building2 className="h-4 w-4" />
          Manage institution settings
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground text-center">
          To update institution details, contact your institution administrator.
        </p>
      )}
    </div>
  )
}

// ── Branding Tab ──────────────────────────────────────────────────────────────
function BrandingTab() {
  const { user, refreshUser } = useAuth()

  const [institutionName,  setInstitutionName]  = useState(user?.personalInstitutionName  ?? '')
  const [institutionMotto, setInstitutionMotto] = useState(user?.personalInstitutionMotto ?? '')
  const [institutionType,  setInstitutionType]  = useState<InstitutionType>(
    (user?.personalInstitutionType as InstitutionType | null | undefined) ?? 'UNIVERSITY'
  )
  const [logoPreview,      setLogoPreview]      = useState<string | null>(
    user?.personalInstitutionLogoUrl ?? null
  )
  const [saving,        setSaving]       = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      await authApi.updateProfile({ personalInstitutionName: institutionName, personalInstitutionMotto: institutionMotto, personalInstitutionType: institutionType })
      await refreshUser()
      setMsg({ type: 'success', text: 'Branding saved.' })
    } catch {
      setMsg({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally { setSaving(false) }
  }

  async function handleLogo(file: File) {
    if (!file.type.startsWith('image/')) { setMsg({ type: 'error', text: 'Please select an image file' }); return }
    if (file.size > 5 * 1024 * 1024)    { setMsg({ type: 'error', text: 'Image must be under 5 MB' }); return }
    setMsg(null)
    const localUrl = URL.createObjectURL(file)
    setLogoPreview(localUrl)
    setLogoUploading(true)
    try {
      const { logoUrl } = await authApi.uploadInstitutionLogo(file)
      setLogoPreview(logoUrl)
      await refreshUser()
      setMsg({ type: 'success', text: 'Logo uploaded.' })
    } catch {
      setMsg({ type: 'error', text: 'Logo upload failed. Please try again.' })
      setLogoPreview(user?.personalInstitutionLogoUrl ?? null)
    } finally {
      setLogoUploading(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-lg space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Document Branding</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Used on generated documents like the Mark Sheet — your institution name, motto, and logo.
        </p>
      </div>

      {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} description={msg.text} />}

      {/* Logo uploader */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Institution Logo</label>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 rounded-xl border-2 border-border bg-muted/30 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Institution logo" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground/40" />
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
              disabled={logoUploading}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              aria-label="Upload institution logo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground">JPEG, PNG, WEBP · Max 5 MB</p>
            <button type="button" onClick={() => logoRef.current?.click()} disabled={logoUploading}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50">
              {logoPreview ? 'Change logo' : 'Upload logo'}
            </button>
          </div>
        </div>
        <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogo(f) }} />
      </div>

      <TextField
        label="Institution / University Name"
        value={institutionName}
        onChange={(e) => setInstitutionName(e.target.value)}
        disabled={saving}
        placeholder="e.g. Gregory University, Uturu"
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Institution Type</label>
        <select
          value={institutionType}
          onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
          disabled={saving}
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          {(Object.keys(INSTITUTION_TYPE_LABELS) as InstitutionType[]).map((t) => (
            <option key={t} value={t}>{INSTITUTION_TYPE_LABELS[t]}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          Sets the grading scale used in the Mark Sheet and other documents.
        </p>
      </div>

      <TextField
        label="Motto"
        value={institutionMotto}
        onChange={(e) => setInstitutionMotto(e.target.value)}
        disabled={saving}
        placeholder="e.g. Knowledge for Tomorrow"
      />

      <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">Save branding</Button>
    </form>
  )
}

// ── Grading Tab ───────────────────────────────────────────────────────────────
function GradingTab() {
  const [instType, setInstType] = useState<InstitutionType>('UNIVERSITY')
  const [bands,    setBands]    = useState<GradeBand[]>(() => loadCustomBands('UNIVERSITY'))
  const [saved,    setSaved]    = useState(false)

  function changeInstType(t: InstitutionType) {
    setInstType(t)
    setBands(loadCustomBands(t))
    setSaved(false)
  }

  function save() {
    saveCustomBands(instType, bands)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function reset() {
    const defaults = GRADE_SCALES[instType].bands.map((b) => ({ ...b }))
    setBands(defaults)
    saveCustomBands(instType, defaults)
    setSaved(false)
  }

  const sorted = sortedBands(bands)

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h3 className="font-semibold">Grading System</h3>
        <p className="text-sm text-muted-foreground">
          Customize grade bands for each institution type. These are applied to Mark Sheet calculations automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Institution Type</label>
        <select
          value={instType}
          onChange={(e) => changeInstType(e.target.value as InstitutionType)}
          className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {INSTITUTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">
        Edit score boundaries, grade letters, and grade points below. Bands sort automatically.
        The <strong>Min Pass Mark</strong> is configured per-document in the Mark Sheet generator.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse mb-2">
          <thead>
            <tr className="bg-muted/40">
              <th className="border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground">Score Range</th>
              <th className="border border-border px-2 py-1.5 text-center font-semibold text-muted-foreground">Min Score</th>
              <th className="border border-border px-2 py-1.5 text-center font-semibold text-muted-foreground">Grade</th>
              <th className="border border-border px-2 py-1.5 text-center font-semibold text-muted-foreground">Grade Point</th>
              <th className="border border-border px-2 py-1.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((band, i) => {
              const origIdx = bands.indexOf(band)
              return (
                <tr key={origIdx} className="hover:bg-muted/10">
                  <td className="border border-border px-2 py-1 text-muted-foreground font-mono">{bandLabel(sorted, i)}</td>
                  <td className="border border-border p-0.5 text-center">
                    <input
                      type="number" min={0} max={100}
                      value={band.min}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0
                        setBands((prev) => prev.map((b, idx) => idx === origIdx ? { ...b, min: v } : b))
                        setSaved(false)
                      }}
                      className="w-14 text-center text-xs bg-transparent outline-none border border-transparent focus:border-ring rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="border border-border p-0.5 text-center">
                    <input
                      type="text"
                      value={band.grade}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().slice(0, 4)
                        setBands((prev) => prev.map((b, idx) => idx === origIdx ? { ...b, grade: v } : b))
                        setSaved(false)
                      }}
                      className="w-14 text-center text-xs bg-transparent outline-none border border-transparent focus:border-ring rounded px-1 py-0.5 font-semibold"
                    />
                  </td>
                  <td className="border border-border p-0.5 text-center">
                    <input
                      type="number" min={0} max={10} step={0.25}
                      value={band.gp ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value === '' ? undefined : parseFloat(e.target.value)
                        setBands((prev) => prev.map((b, idx) => idx === origIdx ? { ...b, gp: v } : b))
                        setSaved(false)
                      }}
                      className="w-16 text-center text-xs bg-transparent outline-none border border-transparent focus:border-ring rounded px-1 py-0.5"
                    />
                  </td>
                  <td className="border border-border p-0.5 text-center">
                    <button
                      type="button"
                      onClick={() => { setBands((prev) => prev.filter((_, idx) => idx !== origIdx)); setSaved(false) }}
                      className="h-5 w-5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs inline-flex items-center justify-center"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => { setBands((prev) => [...prev, { min: 0, grade: 'NEW', gp: undefined }]); setSaved(false) }}
        className="px-3 py-1 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
      >
        + Add Grade Band
      </button>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="primary" onClick={save}>
          {saved ? 'Saved!' : 'Save grading system'}
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          Reset to default
        </Button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, security, and preferences</p>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 sm:flex-col sm:w-48 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left whitespace-nowrap',
                activeTab === id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 rounded-xl border border-border bg-card p-6">
          {activeTab === 'profile'       && <ProfileTab />}
          {activeTab === 'security'      && <SecurityTab />}
          {activeTab === 'sessions'      && <SessionsTab />}
          {activeTab === 'appearance'    && <AppearanceTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'branding'      && <BrandingTab />}
          {activeTab === 'grading'       && <GradingTab />}
          {activeTab === 'institution'   && <InstitutionTab />}
        </div>
      </div>
    </div>
  )
}
