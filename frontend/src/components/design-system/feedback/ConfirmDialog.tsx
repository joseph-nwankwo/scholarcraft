import { type ReactNode } from 'react'
import { AlertTriangle, Trash2, Info } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: ConfirmDialogVariant
  loading?: boolean
  children?: ReactNode
}

const variantConfig: Record<ConfirmDialogVariant, {
  Icon: typeof Trash2
  iconBg: string
  iconColor: string
  actionClass: string
}> = {
  danger: {
    Icon: Trash2,
    iconBg: 'bg-error-muted',
    iconColor: 'text-error',
    actionClass: 'bg-error text-error-foreground hover:bg-error/90 focus:ring-error',
  },
  warning: {
    Icon: AlertTriangle,
    iconBg: 'bg-warning-muted',
    iconColor: 'text-warning',
    actionClass: 'bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning',
  },
  info: {
    Icon: Info,
    iconBg: 'bg-info-muted',
    iconColor: 'text-info',
    actionClass: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading,
  children,
}: ConfirmDialogProps) {
  const { Icon, iconBg, iconColor, actionClass } = variantConfig[variant]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[400px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBg)}>
              <Icon className={cn('h-5 w-5', iconColor)} aria-hidden />
            </div>
            <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          </div>
          {description && (
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>

        {children && (
          <div className="mt-2 text-sm text-muted-foreground">
            {children}
          </div>
        )}

        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onCancel}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={cn('flex-1 sm:flex-none min-w-[90px]', actionClass)}
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing…
              </span>
            ) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
