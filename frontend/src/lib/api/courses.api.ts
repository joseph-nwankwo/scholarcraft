import { apiClient } from './client'
import type { PaginationParams, PaginatedResponse } from '@/types/api.types'

export interface Course {
  id:           string
  createdBy:    string
  title:        string
  code:         string | null
  description:  string | null
  level:        string
  credits:      number | null
  semester:     string | null
  academicYear: string | null
  department:   string | null
  faculty:      string | null
  createdAt:    string
  updatedAt:    string
}

export interface CreateCoursePayload {
  title: string
  code?: string
  description?: string
  level: string
  credits?: number
  semester?: string
  academicYear?: string
  department?: string
  faculty?: string
}

export const coursesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Course>>('/courses', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<{ course: Course }>(`/courses/${id}`).then((r) => r.data.course),

  create: (payload: CreateCoursePayload) =>
    apiClient.post<{ course: Course }>('/courses', payload).then((r) => r.data.course),

  update: (id: string, payload: Partial<CreateCoursePayload>) =>
    apiClient.put<{ course: Course }>(`/courses/${id}`, payload).then((r) => r.data.course),

  delete: (id: string) =>
    apiClient.delete(`/courses/${id}`),
}
