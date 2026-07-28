import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title?:   string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* Panel */}
      <div className={cn('relative w-full rounded-2xl border border-border bg-card p-6 shadow-xl', sizes[size], className)}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {!title && (
          <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}
