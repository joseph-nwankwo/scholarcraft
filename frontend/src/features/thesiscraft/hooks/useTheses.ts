import { useState, useEffect, useCallback } from 'react'
import { thesiscraftApi, type ThesisSummary } from '@/lib/api/thesiscraft.api'

export function useTheses() {
  const [theses, setTheses] = useState<ThesisSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setTheses(await thesiscraftApi.listTheses())
      setError('')
    } catch {
      setError('Could not load your theses. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function create(data: { title: string; field?: string; degreeType?: string; supervisorName?: string }) {
    const thesis = await thesiscraftApi.createThesis(data)
    await refresh()
    return thesis
  }

  async function remove(id: string) {
    await thesiscraftApi.deleteThesis(id)
    setTheses((prev) => prev.filter((t) => t.id !== id))
  }

  return { theses, loading, error, create, remove, refresh }
}
