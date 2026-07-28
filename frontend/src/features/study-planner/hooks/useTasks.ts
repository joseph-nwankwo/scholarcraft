import { useState, useEffect, useCallback } from 'react'
import { studyPlannerApi, type StudyTask, type TaskPriority } from '@/lib/api/studyPlanner.api'

export function useTasks() {
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setTasks(await studyPlannerApi.listTasks())
      setError('')
    } catch {
      setError('Could not load tasks. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function create(data: {
    title: string; description?: string; subjectId?: string | null
    priority?: TaskPriority; dueDate?: string | null; reminderMinutesBefore?: number | null
  }) {
    const task = await studyPlannerApi.createTask(data)
    setTasks((prev) => [task, ...prev])
    return task
  }

  async function update(id: string, data: Partial<{
    title: string; description: string; subjectId: string | null
    priority: TaskPriority; dueDate: string | null; completed: boolean
    reminderMinutesBefore: number | null
  }>) {
    const task = await studyPlannerApi.updateTask(id, data)
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)))
    return task
  }

  async function remove(id: string) {
    await studyPlannerApi.deleteTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  async function toggle(task: StudyTask) {
    return update(task.id, { completed: !task.completed })
  }

  return { tasks, loading, error, create, update, remove, toggle, refresh }
}
