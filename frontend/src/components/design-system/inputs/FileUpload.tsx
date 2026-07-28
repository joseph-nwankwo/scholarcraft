import { useRef, useState, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, X, File, FileText, Image, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/design-system/buttons/Button'
import { Spinner } from '@/components/design-system/feedback/Spinner'

export interface UploadedFile {
  id: string
  file: File
  progress?: number
  error?: string
  url?: string
}

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSizeMB?: number
  maxFiles?: number
  files?: UploadedFile[]
  onFilesChange?: (files: File[]) => void
  onRemove?: (id: string) => void
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return <Image className="h-4 w-4" />
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

export function FileUpload({
  accept,
  multiple = false,
  maxSizeMB = 10,
  maxFiles = 10,
  files = [],
  onFilesChange,
  onRemove,
  disabled,
  label = 'Drop files here or click to browse',
  hint,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validate = useCallback((fileList: File[]): { valid: File[]; errors: string[] } => {
    const errs: string[] = []
    const valid: File[] = []
    for (const f of fileList) {
      if (maxSizeMB && f.size > maxSizeMB * 1024 * 1024) {
        errs.push(`${f.name} exceeds ${maxSizeMB}MB limit`)
        continue
      }
      if (files.length + valid.length >= maxFiles) {
        errs.push(`Maximum ${maxFiles} files allowed`)
        break
      }
      valid.push(f)
    }
    return { valid, errors: errs }
  }, [files.length, maxFiles, maxSizeMB])

  const processFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const { valid, errors: errs } = validate(Array.from(fileList))
    setErrors(errs)
    if (valid.length > 0) onFilesChange?.(valid)
  }, [validate, onFilesChange])

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    processFiles(e.dataTransfer.files)
  }, [disabled, processFiles])

  const onDragOver = (e: DragEvent) => { e.preventDefault(); if (!disabled) setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => processFiles(e.target.files)

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDragEnd={onDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        aria-label="Upload file zone"
        aria-disabled={disabled}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed',
          'px-6 py-8 text-center transition-colors duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', dragging ? 'bg-primary/10' : 'bg-muted')}>
          <Upload className={cn('h-5 w-5', dragging ? 'text-primary' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {accept ? `Accepted: ${accept}` : 'Any file type'} · Max {maxSizeMB}MB
          </p>
        </div>
        <Button variant="outline" size="sm" tabIndex={-1} aria-hidden>
          Browse files
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onInputChange}
        className="hidden"
        aria-hidden
      />

      {/* Errors */}
      {errors.map((err, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-error">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      ))}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2" aria-label="Uploaded files">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
              <span className="text-muted-foreground shrink-0">{fileIcon(f.file.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
                {f.progress !== undefined && f.progress < 100 && (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.error && <p className="text-xs text-error mt-0.5">{f.error}</p>}
              </div>
              {f.progress !== undefined && f.progress < 100 && !f.error ? (
                <Spinner size="sm" />
              ) : (
                onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(f.id)}
                    className="text-muted-foreground hover:text-error transition-colors shrink-0"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
