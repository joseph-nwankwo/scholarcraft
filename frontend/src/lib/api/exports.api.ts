import { apiClient } from './client'

export type ExportFormat = 'pdf' | 'docx' | 'markdown' | 'html' | 'pptx'

export interface Export {
  id: string
  format: ExportFormat
  fileUrl: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  documentId: string
  createdAt: string
}

export const exportsApi = {
  create: (documentId: string, format: ExportFormat) =>
    apiClient.post<{ export: Export }>('/exports', { documentId, format }).then((r) => r.data.export),

  get: (id: string) =>
    apiClient.get<{ export: Export }>(`/exports/${id}`).then((r) => r.data.export),

  list: () =>
    apiClient.get<{ exports: Export[] }>('/exports').then((r) => r.data.exports),
}
