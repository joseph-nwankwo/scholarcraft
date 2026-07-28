import { apiClient } from './client'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface StudySubject {
  id: string
  name: string
  color: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface StudyTask {
  id: string
  title: string
  description: string | null
  subjectId: string | null
  subject: StudySubject | null
  priority: TaskPriority
  dueDate: string | null
  reminderMinutesBefore: number | null
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TimetableEntry {
  id: string
  title: string
  subjectId: string | null
  subject: { id: string; name: string; color: string } | null
  dayOfWeek: number
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
}

export interface StudySession {
  id: string
  subjectId: string | null
  subject: { id: string; name: string; color: string } | null
  taskId: string | null
  task: { id: string; title: string } | null
  notes: string | null
  startTime: string
  endTime: string | null
  durationMinutes: number | null
  createdAt: string
}

export const studyPlannerApi = {
  // Subjects
  listSubjects: () =>
    apiClient.get<{ subjects: StudySubject[] }>('/study-planner/subjects').then((r) => r.data.subjects),

  createSubject: (data: { name: string; color?: string; description?: string }) =>
    apiClient.post<{ subject: StudySubject }>('/study-planner/subjects', data).then((r) => r.data.subject),

  updateSubject: (id: string, data: Partial<{ name: string; color: string; description: string }>) =>
    apiClient.patch<{ subject: StudySubject }>(`/study-planner/subjects/${id}`, data).then((r) => r.data.subject),

  deleteSubject: (id: string) => apiClient.delete(`/study-planner/subjects/${id}`),

  // Tasks
  listTasks: () =>
    apiClient.get<{ tasks: StudyTask[] }>('/study-planner/tasks').then((r) => r.data.tasks),

  createTask: (data: {
    title: string; description?: string; subjectId?: string | null
    priority?: TaskPriority; dueDate?: string | null; reminderMinutesBefore?: number | null
  }) =>
    apiClient.post<{ task: StudyTask }>('/study-planner/tasks', data).then((r) => r.data.task),

  updateTask: (id: string, data: Partial<{
    title: string; description: string; subjectId: string | null
    priority: TaskPriority; dueDate: string | null; completed: boolean
    reminderMinutesBefore: number | null
  }>) =>
    apiClient.patch<{ task: StudyTask }>(`/study-planner/tasks/${id}`, data).then((r) => r.data.task),

  deleteTask: (id: string) => apiClient.delete(`/study-planner/tasks/${id}`),

  // Study sessions
  listSessions: (limit = 50) =>
    apiClient.get<{ sessions: StudySession[] }>('/study-planner/sessions', { params: { limit } }).then((r) => r.data.sessions),

  logSession: (data: { subjectId?: string | null; taskId?: string | null; notes?: string; durationMinutes: number }) =>
    apiClient.post<{ session: StudySession }>('/study-planner/sessions', data).then((r) => r.data.session),

  deleteSession: (id: string) => apiClient.delete(`/study-planner/sessions/${id}`),

  // Timetable
  listTimetable: () =>
    apiClient.get<{ entries: TimetableEntry[] }>('/study-planner/timetable').then((r) => r.data.entries),

  createTimetableEntry: (data: { title: string; subjectId?: string | null; dayOfWeek: number; startTime: string; endTime: string }) =>
    apiClient.post<{ entry: TimetableEntry }>('/study-planner/timetable', data).then((r) => r.data.entry),

  updateTimetableEntry: (id: string, data: Partial<{
    title: string; subjectId: string | null; dayOfWeek: number; startTime: string; endTime: string
  }>) =>
    apiClient.patch<{ entry: TimetableEntry }>(`/study-planner/timetable/${id}`, data).then((r) => r.data.entry),

  deleteTimetableEntry: (id: string) => apiClient.delete(`/study-planner/timetable/${id}`),
}
