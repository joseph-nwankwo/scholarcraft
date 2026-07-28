import { useState, useEffect, useCallback } from 'react'
import { thesiscraftApi, type ThesisReferenceDocument } from '@/lib/api/thesiscraft.api'

export function useReferences(thesisId: string) {
  const [documents, setDocuments] = useState<ThesisReferenceDocument[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  const refresh = useCallback(async () => {
    try {
      setDocuments(await thesiscraftApi.listReferences(thesisId))
      setError('')
    } catch {
      setError('Could not load your reference library. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [thesisId])

  useEffect(() => { refresh() }, [refresh])

  async function upload(files: File[]) {
    const uploaded = await thesiscraftApi.uploadReferences(thesisId, files)
    setDocuments((prev) => [...uploaded, ...prev])
    return uploaded
  }

  async function remove(id: string) {
    await thesiscraftApi.deleteReference(id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))
  }

  return { documents, loading, error, upload, remove, refresh }
}
