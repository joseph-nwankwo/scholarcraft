import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES } from '@/constants/routes'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-muted">
            <FileQuestion className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-7xl font-black tracking-tighter text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>
          <p className="text-sm text-muted-foreground text-balance">
            The page you're looking for doesn't exist or has been moved. Double-check the URL or head back home.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="primary" leftIcon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate(ROUTES.DASHBOARD)}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
