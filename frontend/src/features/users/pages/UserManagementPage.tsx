import { useEffect, useState, useCallback } from 'react'
import { UserPlus, Ban, Trash2, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { Button } from '@/components/design-system/buttons/Button'
import { Badge } from '@/components/design-system/display/Badge'
import { Alert } from '@/components/design-system/feedback/Alert'
import type { Column } from '@/components/design-system/data/DataTable'
import { DataTable } from '@/components/design-system/data/DataTable'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'PENDING_VERIFICATION'
  emailVerified: boolean
  department: string | null
  lastLogin: string | null
  createdAt: string
  roleAssignments: { role: { slug: string; name: string } }[]
}

interface UsersResponse {
  users: UserRow[]
  total: number
  page: number
  totalPages: number
}

const STATUS_BADGE: Record<UserRow['status'], 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE:               'success',
  PENDING_VERIFICATION: 'warning',
  SUSPENDED:            'error',
  INACTIVE:             'default',
}

function statusLabel(s: UserRow['status']): string {
  return s === 'PENDING_VERIFICATION' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()
}

const COLUMNS: Column<UserRow>[] = [
  {
    key: 'name',
    header: 'User',
    sortable: true,
    cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {row.name[0]?.toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'roleAssignments',
    header: 'Role',
    cell: (row) => {
      const slug = row.roleAssignments[0]?.role.name ?? row.role
      return <span className="text-sm text-muted-foreground">{slug}</span>
    },
  },
  {
    key: 'department',
    header: 'Department',
    cell: (row) => <span className="text-sm text-muted-foreground">{row.department ?? '—'}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    cell: (row) => (
      <Badge variant={STATUS_BADGE[row.status]} size="sm">{statusLabel(row.status)}</Badge>
    ),
  },
  {
    key: 'lastLogin',
    header: 'Last login',
    cell: (row) => (
      <span className="text-xs text-muted-foreground">
        {row.lastLogin ? new Date(row.lastLogin).toLocaleDateString() : 'Never'}
      </span>
    ),
  },
]

async function fetchUsers(search: string, page: number): Promise<UsersResponse> {
  const q = new URLSearchParams({ page: String(page), limit: '20', ...(search ? { search } : {}) })
  const res = await apiClient.get<UsersResponse>(`/users?${q.toString()}`)
  return res.data
}

async function patchStatus(userId: string, status: UserRow['status']) {
  await apiClient.patch(`/users/${userId}/status`, { status })
}

async function deleteUser(userId: string) {
  await apiClient.delete(`/users/${userId}`)
}

export default function UserManagementPage() {
  const [data,     setData]     = useState<UserRow[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search]               = useState('')
  const [page]                 = useState(1)
  const [total,    setTotal]    = useState(0)
  const [error,    setError]    = useState('')
  const [,         setSelected] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchUsers(search, page)
      setData(res.users)
      setTotal(res.total)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [search, page])

  useEffect(() => { void load() }, [load])

  async function handleSuspend(userId: string) {
    await patchStatus(userId, 'SUSPENDED')
    await load()
  }

  async function handleActivate(userId: string) {
    await patchStatus(userId, 'ACTIVE')
    await load()
  }

  async function handleDelete(userId: string) {
    if (!confirm('Remove this user from the institution?')) return
    await deleteUser(userId)
    await load()
  }

  const ACTIONS: Column<UserRow> = {
    key: 'id',
    header: '',
    cell: (row) => (
      <div className="flex items-center justify-end gap-1">
        {row.status === 'SUSPENDED' ? (
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => handleActivate(row.id)}>Activate</Button>
        ) : (
          <Button variant="ghost" size="sm" leftIcon={<Ban className="h-4 w-4" />} onClick={() => handleSuspend(row.id)}>Suspend</Button>
        )}
        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} className="text-destructive hover:text-destructive" onClick={() => handleDelete(row.id)}>
          Remove
        </Button>
      </div>
    ),
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">{total} members in your institution</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus className="h-4 w-4" />}>Invite user</Button>
      </div>

      {error && <Alert variant="error" description={error} />}

      <DataTable<UserRow>
        data={data}
        columns={[...COLUMNS, ACTIONS]}
        loading={loading}
        searchable
        selectable
        stickyHeader
        pagination
        bulkActions={[
          { label: 'Suspend selected', icon: <Ban className="h-4 w-4" />,   action: 'suspend' },
          { label: 'Remove selected',  icon: <Trash2 className="h-4 w-4" />, action: 'delete', variant: 'destructive' as const },
        ]}
        onBulkAction={async (action, rows) => {
          if (action === 'suspend') await Promise.all(rows.map((row) => patchStatus(row.id, 'SUSPENDED')))
          if (action === 'delete') {
            if (!confirm(`Remove ${rows.length} users?`)) return
            await Promise.all(rows.map((row) => deleteUser(row.id)))
          }
          setSelected([])
          await load()
        }}
        emptyTitle="No users found"
      />
    </div>
  )
}
