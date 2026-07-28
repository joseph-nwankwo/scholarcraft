import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { StudyTask } from '@/lib/api/studyPlanner.api'

const NOTIFIED_KEY = 'sp_notified_reminders'
const CHECK_INTERVAL_MS = 30_000
const STALE_WINDOW_MS = 24 * 60 * 60 * 1000 // ignore reminders that became due more than a day ago

function getNotifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markNotified(id: string) {
  const ids = getNotifiedIds()
  ids.add(id)
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids].slice(-200)))
}

/**
 * Fires an in-app toast + (if permitted) a browser Notification for tasks whose
 * reminder time has arrived. Runs only while the Study Planner is mounted — there's
 * no service worker, so reminders don't fire while the app is closed.
 */
export function useTaskReminders(tasks: StudyTask[]) {
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    function checkReminders() {
      const now = Date.now()
      const notified = getNotifiedIds()

      for (const task of tasksRef.current) {
        if (task.completed || !task.dueDate || task.reminderMinutesBefore == null) continue
        if (notified.has(task.id)) continue

        const dueAt    = new Date(task.dueDate).getTime()
        const remindAt = dueAt - task.reminderMinutesBefore * 60_000
        if (remindAt > now) continue
        if (now - remindAt > STALE_WINDOW_MS) continue

        const dueLabel = new Date(task.dueDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        toast(task.title, { description: `Due ${dueLabel}`, duration: 8000 })

        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(task.title, { body: `Due ${dueLabel}`, tag: task.id })
        }

        markNotified(task.id)
      }
    }

    checkReminders()
    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])
}
