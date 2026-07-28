import { useState, useEffect, useCallback } from 'react'
import { studyPlannerApi, type StudySubject } from '@/lib/api/studyPlanner.api'

export function useSubjects() {
  const [subjects, setSubjects] = useState<StudySubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setSubjects(await studyPlannerApi.listSubjects())
      setError('')
    } catch {
      setError('Could not load subjects. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function create(data: { name: string; color?: string; description?: string }) {
    const subject = await studyPlannerApi.createSubject(data)
    setSubjects((prev) => [...prev, subject].sort((a, b) => a.name.localeCompare(b.name)))
    return subject
  }

  async function update(id: string, data: Partial<{ name: string; color: string; description: string }>) {
    const subject = await studyPlannerApi.updateSubject(id, data)
    setSubjects((prev) => prev.map((s) => (s.id === id ? subject : s)))
    return subject
  }

  async function remove(id: string) {
    await studyPlannerApi.deleteSubject(id)
    setSubjects((prev) => prev.filter((s) => s.id !== id))
  }

  return { subjects, loading, error, create, update, remove, refresh }
}
