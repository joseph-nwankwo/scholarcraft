import { useNavigate } from 'react-router-dom'
import { ShieldX, ShieldAlert, ServerCrash, WifiOff, Wrench, ArrowLeft, LayoutDashboard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/lib/utils'

interface ErrorPageLayoutProps {
  code?: string | number
  icon: React.ReactNode
  title: string
  description: string
  iconBg?: string
  actions?: React.ReactNode
}

function ErrorPageLayout({ code, icon, title, description, iconBg = 'bg-muted', actions }: ErrorPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <div className={cn('flex h-24 w-24 items-center justify-center rounded-2xl', iconBg)}>
            {icon}
          </div>
        </div>
        <div className="space-y-2">
          {code && <p className="text-7xl font-black tracking-tighter text-foreground">{code}</p>}
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground text-balance">{description}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {actions}
        </div>
      </div>
    </div>
  )
}

export function UnauthorizedPage() {
  const navigate = useNavigate()
  return (
    <ErrorPageLayout
      code={401}
      icon={<ShieldX className="h-12 w-12 text-error" strokeWidth={1.5} />}
      iconBg="bg-error-muted"
      title="Unauthorized"
      description="You need to sign in to access this page. Please log in with your credentials and try again."
      actions={
        <>
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="primary" onClick={() => navigate(ROUTES.SIGN_IN)}>
            Sign in
          </Button>
        </>
      }
    />
  )
}

export function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <ErrorPageLayout
      code={403}
      icon={<ShieldAlert className="h-12 w-12 text-warning" strokeWidth={1.5} />}
      iconBg="bg-warning-muted"
      title="Access Denied"
      description="You don't have permission to access this page. Contact your institution administrator if you believe this is an error."
      actions={
        <>
          <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="primary" leftIcon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate(ROUTES.DASHBOARD)}>
            Dashboard
          </Button>
        </>
      }
    />
  )
}

export function ServerErrorPage() {
  const navigate = useNavigate()
  return (
    <ErrorPageLayout
      code={500}
      icon={<ServerCrash className="h-12 w-12 text-error" strokeWidth={1.5} />}
      iconBg="bg-error-muted"
      title="Server Error"
      description="Something went wrong on our end. Our team has been notified and is working to resolve the issue. Please try again shortly."
      actions={
        <>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
            Try again
          </Button>
          <Button variant="primary" leftIcon={<LayoutDashboard className="h-4 w-4" />} onClick={() => navigate(ROUTES.DASHBOARD)}>
            Dashboard
          </Button>
        </>
      }
    />
  )
}

export function OfflinePage() {
  return (
    <ErrorPageLayout
      icon={<WifiOff className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />}
      iconBg="bg-muted"
      title="You're Offline"
      description="It looks like you've lost your internet connection. Check your network settings and try reconnecting."
      actions={
        <Button variant="primary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
          Retry connection
        </Button>
      }
    />
  )
}

export function MaintenancePage() {
  return (
    <ErrorPageLayout
      icon={<Wrench className="h-12 w-12 text-primary" strokeWidth={1.5} />}
      iconBg="bg-primary/10"
      title="Under Maintenance"
      description="ScholarCraft is currently undergoing scheduled maintenance to improve your experience. We'll be back online shortly."
      actions={
        <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => window.location.reload()}>
          Check again
        </Button>
      }
    />
  )
}
