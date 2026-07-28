import { useState, useEffect } from 'react'
import { Building2, Globe, Mail, Clock, Package } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { TextField } from '@/components/design-system/inputs/TextField'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Badge } from '@/components/design-system/display/Badge'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'

export type InstitutionType = 'UNIVERSITY' | 'POLYTECHNIC' | 'COLLEGE_OF_EDUCATION' | 'MONOTECHNIC' | 'VOCATIONAL_INSTITUTION' | 'OTHER'

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  UNIVERSITY:            'University',
  POLYTECHNIC:           'Polytechnic',
  COLLEGE_OF_EDUCATION:  'College of Education',
  MONOTECHNIC:           'Monotechnic',
  VOCATIONAL_INSTITUTION:'Vocational Institution',
  OTHER:                 'Other',
}

interface Institution {
  id: string; name: string; abbreviation: string | null; domain: string | null; logo: string | null
  institutionType: InstitutionType
  contactEmail: string | null; contactPhone: string | null; website: string | null
  address: string | null; city: string | null; state: string | null; country: string; timezone: string
  subscriptionPlan: string; subscriptionStatus: string
  maxUsers: number; maxCourses: number; storageLimitGb: number; isActive: boolean
  _count?: { users: number; courses: number }
  updatedAt: string
}

interface Stats { userCount: number; courseCount: number; documentCount: number; aiCount: number }

const PLAN_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  FREE: 'default', STARTER: 'default', PROFESSIONAL: 'success', ENTERPRISE: 'success',
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  TRIAL: 'warning', ACTIVE: 'success', EXPIRED: 'error', CANCELLED: 'error', SUSPENDED: 'error',
}

function InfoCard({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function InstitutionSettingsPage() {
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState({
    name: '', abbreviation: '', institutionType: 'UNIVERSITY' as InstitutionType,
    contactEmail: '', contactPhone: '',
    website: '', address: '', city: '', state: '', country: '', timezone: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const [instRes, statsRes] = await Promise.all([
          apiClient.get<{ institution: Institution }>('/institutions'),
          apiClient.get<{ stats: Stats }>('/institutions/stats'),
        ])
        setInstitution(instRes.data.institution)
        setStats(statsRes.data.stats)
        const i = instRes.data.institution
        setForm({
          name: i.name, abbreviation: i.abbreviation ?? '',
          institutionType: i.institutionType ?? 'UNIVERSITY',
          contactEmail: i.contactEmail ?? '',
          contactPhone: i.contactPhone ?? '', website: i.website ?? '', address: i.address ?? '',
          city: i.city ?? '', state: i.state ?? '', country: i.country, timezone: i.timezone,
        })
      } catch {
        setMsg({ type: 'error', text: 'Failed to load institution data' })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  function upd(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const res = await apiClient.put<{ institution: Institution }>('/institutions', form)
      setInstitution(res.data.institution)
      setMsg({ type: 'success', text: 'Institution settings saved successfully.' })
    } catch (err: unknown) {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMsg({ type: 'error', text: m ?? 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-64 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          Institution Settings
        </h1>
        <p className="text-sm text-muted-foreground">Manage your institution's profile and contact information</p>
      </div>

      {/* Subscription banner */}
      {institution && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{institution.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={PLAN_BADGE[institution.subscriptionPlan] ?? 'default'} size="sm">
                  {institution.subscriptionPlan}
                </Badge>
                <Badge variant={STATUS_BADGE[institution.subscriptionStatus] ?? 'default'} size="sm">
                  {institution.subscriptionStatus}
                </Badge>
              </div>
            </div>
          </div>
          {stats && (
            <div className="flex gap-6 text-center">
              {([
                ['Users', stats.userCount, institution.maxUsers],
                ['Courses', stats.courseCount, institution.maxCourses],
                ['Storage', `${stats.documentCount} docs`, `${institution.storageLimitGb}GB`],
              ] as const).map(([label, used, max]) => (
                <div key={String(label)}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold">{used} <span className="text-muted-foreground font-normal">/ {max}</span></p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Read-only info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InfoCard icon={Globe} label="Domain" value={institution?.domain} />
        <InfoCard icon={Clock} label="Timezone" value={institution?.timezone} />
        <InfoCard icon={Building2} label="Country" value={institution?.country} />
        <InfoCard icon={Mail} label="Active" value={institution?.isActive ? 'Yes' : 'No'} />
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="font-semibold text-foreground">Profile information</h2>
        {msg && <Alert variant={msg.type === 'success' ? 'success' : 'error'} description={msg.text} />}

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Institution name" value={form.name} onChange={upd('name')} required disabled={saving} />
          <TextField label="Abbreviation" value={form.abbreviation} onChange={upd('abbreviation')} disabled={saving} placeholder="UNILAG" />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Institution Type</label>
          <select
            value={form.institutionType}
            onChange={(e) => setForm((p) => ({ ...p, institutionType: e.target.value as InstitutionType }))}
            disabled={saving}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          >
            {(Object.keys(INSTITUTION_TYPE_LABELS) as InstitutionType[]).map((t) => (
              <option key={t} value={t}>{INSTITUTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Determines the grading scale used in mark sheets and assessments.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TextField label="Contact email" type="email" value={form.contactEmail} onChange={upd('contactEmail')} disabled={saving} />
          <TextField label="Contact phone" value={form.contactPhone} onChange={upd('contactPhone')} disabled={saving} placeholder="+234 xxx xxx xxxx" />
        </div>

        <TextField label="Website" type="url" value={form.website} onChange={upd('website')} disabled={saving} placeholder="https://institution.edu.ng" />
        <TextField label="Address" value={form.address} onChange={upd('address')} disabled={saving} />

        <div className="grid grid-cols-3 gap-4">
          <TextField label="City" value={form.city} onChange={upd('city')} disabled={saving} />
          <TextField label="State" value={form.state} onChange={upd('state')} disabled={saving} />
          <TextField label="Country" value={form.country} onChange={upd('country')} disabled={saving} />
        </div>

        <TextField label="Timezone" value={form.timezone} onChange={upd('timezone')} disabled={saving} placeholder="Africa/Lagos" />

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">Save institution settings</Button>
        </div>
      </form>
    </div>
  )
}
