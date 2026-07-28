import { useState, useEffect, useCallback } from 'react'
import { gpaApi, type GpaSemester } from '@/lib/api/gpa.api'

export function useGpaSemesters() {
  const [semesters, setSemesters] = useState<GpaSemester[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setSemesters(await gpaApi.listSemesters())
      setError('')
    } catch {
      setError('Could not load your CGPA data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function createSemester(data: { name: string; session?: string | null }) {
    const semester = await gpaApi.createSemester(data)
    setSemesters((prev) => [...prev, semester])
    return semester
  }

  async function renameSemester(id: string, name: string) {
    const semester = await gpaApi.updateSemester(id, { name })
    setSemesters((prev) => prev.map((s) => (s.id === id ? semester : s)))
  }

  async function setSemesterSession(id: string, session: string | null) {
    const semester = await gpaApi.updateSemester(id, { session })
    setSemesters((prev) => prev.map((s) => (s.id === id ? semester : s)))
  }

  async function removeSemester(id: string) {
    await gpaApi.deleteSemester(id)
    setSemesters((prev) => prev.filter((s) => s.id !== id))
  }

  async function addCourse(semesterId: string, data: { name: string; creditUnits: number; score: number; passMark?: number }) {
    const course = await gpaApi.createCourse(semesterId, data)
    setSemesters((prev) => prev.map((s) => (s.id === semesterId ? { ...s, courses: [...s.courses, course] } : s)))
  }

  async function updateCourse(semesterId: string, courseId: string, data: Partial<{ name: string; creditUnits: number; score: number; passMark: number }>) {
    const course = await gpaApi.updateCourse(courseId, data)
    setSemesters((prev) => prev.map((s) =>
      s.id === semesterId ? { ...s, courses: s.courses.map((c) => (c.id === courseId ? course : c)) } : s
    ))
  }

  async function removeCourse(semesterId: string, courseId: string) {
    await gpaApi.deleteCourse(courseId)
    setSemesters((prev) => prev.map((s) =>
      s.id === semesterId ? { ...s, courses: s.courses.filter((c) => c.id !== courseId) } : s
    ))
  }

  return { semesters, loading, error, createSemester, renameSemester, setSemesterSession, removeSemester, addCourse, updateCourse, removeCourse, refresh }
}
