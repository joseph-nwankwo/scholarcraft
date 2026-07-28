import { useState, useEffect, useCallback } from 'react'
import { studyPlannerApi, type StudySession } from '@/lib/api/studyPlanner.api'

export function useStudySessions(limit = 100) {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setSessions(await studyPlannerApi.listSessions(limit))
      setError('')
    } catch {
      setError('Could not load study sessions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { refresh() }, [refresh])

  async function log(data: { subjectId?: string | null; taskId?: string | null; notes?: string; durationMinutes: number }) {
    const session = await studyPlannerApi.logSession(data)
    setSessions((prev) => [session, ...prev])
    return session
  }

  async function remove(id: string) {
    await studyPlannerApi.deleteSession(id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)

  return { sessions, loading, error, totalMinutes, log, remove, refresh }
}
