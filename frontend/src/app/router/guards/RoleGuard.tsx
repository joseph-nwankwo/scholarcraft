import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { hasPermission, type UserRole } from '@/types/roles.types'
import { ROUTES } from '@/constants/routes'

interface RoleGuardProps {
  requiredRole: UserRole
}

export function RoleGuard({ requiredRole }: RoleGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  if (!user || !hasPermission(user.role, requiredRole)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
