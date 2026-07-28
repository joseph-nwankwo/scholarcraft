import { useState, useEffect, useCallback } from 'react'
import { studyPlannerApi, type TimetableEntry } from '@/lib/api/studyPlanner.api'

export function useTimetable() {
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setEntries(await studyPlannerApi.listTimetable())
      setError('')
    } catch {
      setError('Could not load your timetable. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function create(data: { title: string; subjectId?: string | null; dayOfWeek: number; startTime: string; endTime: string }) {
    const entry = await studyPlannerApi.createTimetableEntry(data)
    setEntries((prev) => [...prev, entry])
    return entry
  }

  async function update(id: string, data: Partial<{
    title: string; subjectId: string | null; dayOfWeek: number; startTime: string; endTime: string
  }>) {
    const entry = await studyPlannerApi.updateTimetableEntry(id, data)
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)))
    return entry
  }

  async function remove(id: string) {
    await studyPlannerApi.deleteTimetableEntry(id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  return { entries, loading, error, create, update, remove, refresh }
}
