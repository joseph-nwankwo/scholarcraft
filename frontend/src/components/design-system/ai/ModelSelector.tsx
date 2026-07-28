import { useState } from 'react'
import { ChevronDown, Zap, Brain, Cpu } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface AIModel {
  id: string
  name: string
  provider: 'anthropic' | 'openai' | 'google'
  contextWindow?: number
  tier?: 'fast' | 'balanced' | 'powerful'
  description?: string
}

export interface ModelSelectorProps {
  value?: string
  onChange?: (modelId: string) => void
  models?: AIModel[]
  disabled?: boolean
  className?: string
}

const defaultModels: AIModel[] = [
  { id: 'claude-sonnet-4-6',       name: 'Claude Sonnet 4.6',    provider: 'anthropic', contextWindow: 200000, tier: 'balanced',  description: 'Best balance of speed and quality' },
  { id: 'claude-haiku-4-5',        name: 'Claude Haiku 4.5',     provider: 'anthropic', contextWindow: 200000, tier: 'fast',      description: 'Fastest responses' },
  { id: 'claude-opus-4-8',         name: 'Claude Opus 4.8',      provider: 'anthropic', contextWindow: 200000, tier: 'powerful',  description: 'Most capable model' },
  { id: 'gpt-4o',                  name: 'GPT-4o',               provider: 'openai',    contextWindow: 128000, tier: 'balanced',  description: 'OpenAI flagship model' },
  { id: 'gpt-4o-mini',             name: 'GPT-4o Mini',          provider: 'openai',    contextWindow: 128000, tier: 'fast',      description: 'Fast and affordable' },
  { id: 'gemini-2.0-flash',        name: 'Gemini 2.0 Flash',     provider: 'google',    contextWindow: 1000000, tier: 'fast',     description: 'Ultra-fast with large context' },
]

const providerMeta = {
  anthropic: { label: 'Anthropic', color: 'text-[#D4A574] bg-[#D4A574]/10' },
  openai:    { label: 'OpenAI',    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
  google:    { label: 'Google',    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
}

const tierMeta = {
  fast:      { label: 'Fast',     icon: <Zap className="h-3 w-3" />,    color: 'text-warning bg-warning-muted' },
  balanced:  { label: 'Balanced', icon: <Cpu className="h-3 w-3" />,    color: 'text-info bg-info-muted' },
  powerful:  { label: 'Powerful', icon: <Brain className="h-3 w-3" />,  color: 'text-primary bg-primary/10' },
}

function groupByProvider(models: AIModel[]): Record<string, AIModel[]> {
  return models.reduce((acc, m) => {
    acc[m.provider] = acc[m.provider] ?? []
    acc[m.provider].push(m)
    return acc
  }, {} as Record<string, AIModel[]>)
}

export function ModelSelector({
  value,
  onChange,
  models = defaultModels,
  disabled,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const selected = models.find((m) => m.id === value) ?? models[0]
  const groups = groupByProvider(models)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 rounded-md border bg-card px-3 py-1.5',
            'text-xs font-medium text-foreground',
            'hover:bg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          {selected && (
            <Badge
              variant="secondary"
              className={cn('h-4 px-1.5 text-[10px] border-0', providerMeta[selected.provider]?.color)}
            >
              {providerMeta[selected.provider]?.label}
            </Badge>
          )}
          <span className="max-w-[120px] truncate">{selected?.name ?? 'Select model…'}</span>
          <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0" sideOffset={4}>
        <div className="border-b px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">Select AI Model</p>
        </div>

        <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y">
          {Object.entries(groups).map(([provider, provModels]) => {
            const meta = providerMeta[provider as keyof typeof providerMeta]
            return (
              <div key={provider}>
                <div className="px-3 py-1.5 bg-muted/40">
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide', meta?.color.split(' ')[0])}>
                    {meta?.label ?? provider}
                  </span>
                </div>
                {provModels.map((model) => {
                  const tier = model.tier ? tierMeta[model.tier] : null
                  const isSelected = model.id === selected?.id
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => { onChange?.(model.id); setOpen(false) }}
                      className={cn(
                        'w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted transition-colors',
                        isSelected && 'bg-primary/5'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                            {model.name}
                          </span>
                          {tier && (
                            <Badge variant="secondary" className={cn('h-4 px-1.5 text-[10px] gap-0.5 border-0', tier.color)}>
                              {tier.icon}
                              {tier.label}
                            </Badge>
                          )}
                        </div>
                        {model.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{model.description}</p>
                        )}
                        {model.contextWindow && (
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                            {(model.contextWindow / 1000).toFixed(0)}K context
                          </p>
                        )}
                      </div>
                      {isSelected && <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
