import { apiClient } from './client'

export interface GpaCourse {
  id: string
  name: string
  creditUnits: number
  score: number
  passMark: number
  createdAt: string
  updatedAt: string
}

export interface GpaSemester {
  id: string
  name: string
  session: string | null
  order: number
  courses: GpaCourse[]
  createdAt: string
  updatedAt: string
}

export const gpaApi = {
  listSemesters: () =>
    apiClient.get<{ semesters: GpaSemester[] }>('/gpa/semesters').then((r) => r.data.semesters),

  createSemester: (data: { name: string; session?: string | null }) =>
    apiClient.post<{ semester: GpaSemester }>('/gpa/semesters', data).then((r) => r.data.semester),

  updateSemester: (id: string, data: Partial<{ name: string; session: string | null; order: number }>) =>
    apiClient.patch<{ semester: GpaSemester }>(`/gpa/semesters/${id}`, data).then((r) => r.data.semester),

  deleteSemester: (id: string) => apiClient.delete(`/gpa/semesters/${id}`),

  createCourse: (semesterId: string, data: { name: string; creditUnits: number; score: number; passMark?: number }) =>
    apiClient.post<{ course: GpaCourse }>(`/gpa/semesters/${semesterId}/courses`, data).then((r) => r.data.course),

  updateCourse: (id: string, data: Partial<{ name: string; creditUnits: number; score: number; passMark: number }>) =>
    apiClient.patch<{ course: GpaCourse }>(`/gpa/courses/${id}`, data).then((r) => r.data.course),

  deleteCourse: (id: string) => apiClient.delete(`/gpa/courses/${id}`),
}
