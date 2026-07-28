import { useId, useState, useRef, type KeyboardEvent } from 'react'
import { Sparkles, ChevronDown, RotateCcw, Wand2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/design-system/buttons/Button'
import { cn } from '@/lib/utils'

export interface PromptTemplate {
  id: string
  label: string
  description?: string
  prompt: string
}

export interface PromptEditorProps {
  value?: string
  systemPrompt?: string
  onChange?: (value: string) => void
  onSystemPromptChange?: (value: string) => void
  onGenerate?: () => void
  loading?: boolean
  templates?: PromptTemplate[]
  placeholder?: string
  systemPlaceholder?: string
  maxLength?: number
  showSystemPrompt?: boolean
  label?: string
  hint?: string
  className?: string
}

function countTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.3)
}

export function PromptEditor({
  value = '',
  systemPrompt = '',
  onChange,
  onSystemPromptChange,
  onGenerate,
  loading,
  templates = [],
  placeholder = 'Describe what you want to generate…',
  systemPlaceholder = 'Optional: Provide context about the course, learning objectives, or formatting requirements…',
  maxLength = 4000,
  showSystemPrompt = false,
  label,
  hint,
  className,
}: PromptEditorProps) {
  const id = useId()
  const [showSystem, setShowSystem] = useState(showSystemPrompt)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const tokens = countTokens(value)
  const sysTokens = countTokens(systemPrompt)

  const insertTemplate = (tpl: PromptTemplate) => {
    onChange?.(tpl.prompt)
    textareaRef.current?.focus()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onGenerate?.()
    }
  }

  const clear = () => { onChange?.(''); onSystemPromptChange?.('') }

  return (
    <div className={cn('rounded-xl border bg-card shadow-card overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5 bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span className="text-xs font-semibold text-foreground">{label ?? 'Prompt'}</span>
        </div>
        <div className="flex items-center gap-1">
          {templates.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Templates
                  <ChevronDown className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="border-b px-3 py-2">
                  <p className="text-xs font-semibold text-foreground">Prompt Templates</p>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin py-1">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => insertTemplate(tpl)}
                      className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                    >
                      <p className="text-xs font-medium text-foreground">{tpl.label}</p>
                      {tpl.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{tpl.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {value && (
            <button
              type="button"
              onClick={clear}
              title="Clear prompt"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Clear prompt"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowSystem((s) => !s)}
            className={cn(
              'rounded-md px-2 py-1 text-xs transition-colors',
              showSystem
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            System
          </button>
        </div>
      </div>

      {/* System prompt (collapsible) */}
      {showSystem && (
        <div className="border-b">
          <div className="px-4 py-2 bg-muted/20">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">System Prompt</p>
            <textarea
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange?.(e.target.value)}
              placeholder={systemPlaceholder}
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground/60 text-right tabular-nums">{sysTokens} tokens</p>
          </div>
        </div>
      )}

      {/* Main prompt */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={6}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-14 text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
          aria-label={label ?? 'Prompt'}
        />

        {/* Footer bar */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className={cn(value.length >= maxLength * 0.9 && 'text-warning', value.length >= maxLength && 'text-error')}>
              {value.length}/{maxLength} chars
            </span>
            <span>~{tokens} tokens</span>
            {hint && <span className="hidden sm:block">{hint}</span>}
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground/60 font-medium">
              <span>⌘</span><span>↵</span>
            </kbd>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              loadingText="Generating…"
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              onClick={onGenerate}
              disabled={!value.trim()}
            >
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
