import { Check, Loader2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProgressBar } from '@/components/design-system/feedback/ProgressBar'

export type StepStatus = 'pending' | 'active' | 'done' | 'error'

export interface GenerationStep {
  id: string
  label: string
  description?: string
  status: StepStatus
}

export interface GenerationProgressProps {
  steps: GenerationStep[]
  title?: string
  subtitle?: string
  showProgress?: boolean
  className?: string
}

const stepIcons = {
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  active:  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
  done:    <Check className="h-3.5 w-3.5 text-success-foreground" />,
  error:   <AlertCircle className="h-3.5 w-3.5 text-error-foreground" />,
}

const stepDotStyle: Record<StepStatus, string> = {
  pending: 'bg-muted border-2 border-border',
  active:  'bg-primary/10 border-2 border-primary',
  done:    'bg-success border-0',
  error:   'bg-error border-0',
}

const stepLabelStyle: Record<StepStatus, string> = {
  pending: 'text-muted-foreground',
  active:  'text-foreground font-medium',
  done:    'text-foreground',
  error:   'text-error',
}

export function GenerationProgress({
  steps,
  title,
  subtitle,
  showProgress = true,
  className,
}: GenerationProgressProps) {
  const doneCount = steps.filter((s) => s.status === 'done').length
  const hasError = steps.some((s) => s.status === 'error')
  const activeStep = steps.find((s) => s.status === 'active')
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0

  return (
    <div className={cn('rounded-xl border bg-card p-5 shadow-card space-y-4', className)}>
      {(title || subtitle || activeStep) && (
        <div className="space-y-0.5">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          <p className="text-xs text-muted-foreground">
            {hasError
              ? 'Generation failed'
              : activeStep?.description ?? activeStep?.label ?? subtitle ?? 'Processing…'
            }
          </p>
        </div>
      )}

      {showProgress && (
        <ProgressBar
          value={progress}
          variant={hasError ? 'error' : doneCount === steps.length ? 'success' : 'primary'}
          size="sm"
          animated
        />
      )}

      {/* Steps */}
      <ol className="space-y-2.5" aria-label="Generation steps">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3">
            {/* Dot + connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                stepDotStyle[step.status]
              )}>
                {stepIcons[step.status]}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'w-px flex-1 mt-1 min-h-[12px]',
                  step.status === 'done' ? 'bg-success/40' : 'bg-border'
                )} />
              )}
            </div>

            {/* Label */}
            <div className="pt-0.5 pb-2 min-w-0">
              <p className={cn('text-sm leading-tight', stepLabelStyle[step.status])}>
                {step.label}
              </p>
              {step.description && step.status === 'active' && (
                <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
