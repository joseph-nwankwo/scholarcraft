import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

export default function ExportsPage() {
  return <Navigate to={ROUTES.EXPORT_CENTER} replace />
}
