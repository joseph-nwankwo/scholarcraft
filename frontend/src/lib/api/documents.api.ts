import { apiClient } from './client'
import type { PaginationParams, PaginatedResponse } from '@/types/api.types'
import type { DocumentType } from '@/constants/app.constants'

export interface Document {
  id: string
  title: string
  type: DocumentType
  content: string | null
  fileUrl: string | null
  fileType: string | null
  sizeBytes: number | null
  tags: string[]
  version: number
  isPublic: boolean
  courseId: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface DocumentFilters extends PaginationParams {
  type?: DocumentType
  courseId?: string
  tags?: string[]
}

export const documentsApi = {
  list: (params?: DocumentFilters) =>
    apiClient.get<PaginatedResponse<Document>>('/documents', { params }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<{ document: Document }>(`/documents/${id}`).then((r) => r.data.document),

  update: (id: string, payload: Partial<Pick<Document, 'title' | 'content' | 'tags'>>) =>
    apiClient.put<{ document: Document }>(`/documents/${id}`, payload).then((r) => r.data.document),

  delete: (id: string) =>
    apiClient.delete(`/documents/${id}`),

  upload: (file: File, courseId?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (courseId) form.append('courseId', courseId)
    return apiClient
      .post<{ document: Document }>('/uploads/document', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.document)
  },
}
