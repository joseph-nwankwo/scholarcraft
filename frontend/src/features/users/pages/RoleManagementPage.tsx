import { useState } from 'react'
import { Shield, ChevronRight, Check, X, Info } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import { Skeleton } from '@/components/design-system/feedback/Skeleton'
import { EmptyState } from '@/components/design-system/cards/EmptyState'
import { cn } from '@/lib/utils'

interface Role {
  id: string
  name: string
  slug: string
  description?: string | null
  isSystem: boolean
  permissions: { permission: { code: string; resource: string; action: string; description?: string | null } }[]
  _count?: { userAssignments: number }
}

interface Permission {
  id: string
  code: string
  resource: string
  action: string
  description?: string | null
}

function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true); setError('')
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get<{ roles: Role[] }>('/users/roles'),
        apiClient.get<{ permissions: Permission[] }>('/users/permissions'),
      ])
      setRoles(rolesRes.data.roles)
      setPerms(permsRes.data.permissions)
    } catch {
      setError('Failed to load roles and permissions')
    } finally {
      setLoading(false)
    }
  }

  useState(() => { void load() })
  return { roles, perms, loading, error, reload: load }
}

// Group permissions by resource
function groupByResource(perms: Permission[]) {
  return perms.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = []
    acc[p.resource].push(p)
    return acc
  }, {})
}

// ── Role Card ─────────────────────────────────────────────────────────────────
function RoleCard({ role, selected, onClick }: { role: Role; selected: boolean; onClick: () => void }) {
  const permCount = role.permissions?.length ?? 0
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border bg-card hover:bg-accent/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', selected ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
            <Shield className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{role.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{role.slug}</p>
          </div>
        </div>
        <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', selected && 'rotate-90')} />
      </div>
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {role.isSystem && <Badge variant="default" size="sm">System</Badge>}
        <Badge variant="default" size="sm">{permCount} permissions</Badge>
        {(role._count?.userAssignments ?? 0) > 0 && (
          <Badge variant="success" size="sm">{role._count!.userAssignments} users</Badge>
        )}
      </div>
    </button>
  )
}

// ── Permission Matrix ─────────────────────────────────────────────────────────
function PermissionMatrix({ role, perms }: { role: Role; perms: Permission[] }) {
  const granted = new Set(role.permissions?.map((rp) => rp.permission.code) ?? [])
  const grouped = groupByResource(perms)

  const resourceLabels: Record<string, string> = {
    courses: 'Courses', documents: 'Documents', ai: 'AI Tools', users: 'Users',
    institution: 'Institution', billing: 'Billing', templates: 'Templates',
    exports: 'Exports', analytics: 'Analytics', audit: 'Audit Logs', settings: 'Settings',
  }

  return (
    <div className="space-y-1">
      {Object.entries(grouped).map(([resource, resourcePerms]) => (
        <div key={resource} className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-2 bg-muted/50 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {resourceLabels[resource] ?? resource}
            </span>
          </div>
          <div className="divide-y divide-border">
            {resourcePerms.map((p) => {
              const has = granted.has(p.code)
              return (
                <div key={p.code} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', has ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted')}>
                      {has ? <Check className="h-3 w-3 text-green-600 dark:text-green-400" /> : <X className="h-3 w-3 text-muted-foreground/50" />}
                    </div>
                    <div>
                      <p className={cn('text-sm font-medium', !has && 'text-muted-foreground')}>{p.action.replace(/_/g, ' ')}</p>
                      {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                    </div>
                  </div>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">{p.code}</code>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RoleManagementPage() {
  const { roles, perms, loading, error } = useRoles()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-muted-foreground">{roles.length} roles · {perms.length} permissions</p>
        </div>
      </div>

      <div className="flex items-start gap-1.5 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          System roles are managed automatically. Select a role to view its permission matrix.
        </p>
      </div>

      {error && <Alert variant="error" description={error} />}

      {loading ? (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          <div className="col-span-8"><Skeleton className="h-[600px] rounded-xl" /></div>
        </div>
      ) : roles.length === 0 ? (
        <EmptyState icon={<Shield className="h-6 w-6" />} title="No roles found" description="Roles are seeded automatically when an institution is created." />
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Role list */}
          <div className="col-span-12 sm:col-span-4 space-y-2">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole?.id === role.id}
                onClick={() => setSelectedRole(role)}
              />
            ))}
          </div>

          {/* Permission matrix */}
          <div className="col-span-12 sm:col-span-8">
            {!selectedRole ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
                <p className="text-sm text-muted-foreground">Select a role to view permissions</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{selectedRole.name}</h2>
                  {selectedRole.description && <p className="text-sm text-muted-foreground">{selectedRole.description}</p>}
                </div>
                <PermissionMatrix role={selectedRole} perms={perms} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
