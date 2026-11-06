import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/design-system/buttons/Button'
import { Alert } from '@/components/design-system/feedback/Alert'
import { studyToolsApi, ALLOWED_STUDY_UPLOAD_ACCEPT } from '@/lib/api/studyTools.api'

interface Props {
  onExtracted: (text: string) => void
}

/** A small "Upload document" trigger that extracts text from a lecture note / PDF / Word doc and hands it back. */
export function UploadDocumentButton({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setLoading(true)
    try {
      const text = await studyToolsApi.extractText(file)
      onExtracted(text)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? `Could not read ${file.name}. Try pasting the text instead.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_STUDY_UPLOAD_ACCEPT}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={loading}
        leftIcon={!loading ? <Upload className="h-3.5 w-3.5" /> : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? 'Reading document…' : 'Upload document (PDF, Word, TXT)'}
      </Button>
      {error && <Alert variant="warning" description={error} />}
    </div>
  )
}