import { client } from './client'

export interface LibraryDocument {
  id: string
  title: string
  type: string
  status: string
  isPinned: boolean
  isTrashed: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
  folderId: string | null
  folder?: { id: string; name: string } | null
  tags?: Array<{ tag: { id: string; name: string; color: string | null } }>
  isFavorited?: boolean
  course?: { code: string; title: string } | null
}

export interface Folder {
  id: string
  name: string
  color: string | null
  icon: string | null
  parentId: string | null
  children?: Folder[]
  _count?: { documents: number }
}

export interface Tag {
  id: string
  name: string
  color: string | null
  _count?: { documents: number }
}

export interface Comment {
  id: string
  content: string
  isResolved: boolean
  parentId: string | null
  createdAt: string
  user: { id: string; name: string; avatar?: string | null }
  replies?: Comment[]
}

export interface ApprovalWorkflow {
  id: string
  status: string
  currentStage: string
  submittedAt: string
  document: { id: string; title: string; type: string; user: { name: string } }
  comments?: string | null
}

export interface ShareLink {
  id: string
  token: string
  allowDownload: boolean
  allowEdit: boolean
  allowComment: boolean
  expiresAt: string | null
  viewCount: number
  createdAt: string
}

export interface ExportRecord {
  id: string
  format: string
  status: string
  fileUrl: string | null
  createdAt: string
  document: { title: string; type: string }
}

export interface ExportTemplate {
  id: string
  name: string
  category: string
  isDefault: boolean
  watermark: string | null
  primaryColor: string | null
  createdAt: string
}

export interface LibraryStats {
  total: number
  pinned: number
  drafts: number
  published: number
  trashed: number
  favorites: number
}

export interface ListParams {
  folderId?: string | null
  type?: string
  status?: string
  tagId?: string
  search?: string
  isPinned?: boolean
  isTrashed?: boolean
  favorites?: boolean
  page?: number
  limit?: number
}

function buildQuery(params: Record<string, unknown>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

export const libraryApi = {
  // Library
  list: (params?: ListParams) =>
    client.get<{ data: LibraryDocument[]; total: number; page: number; totalPages: number }>(`/library${buildQuery((params ?? {}) as Record<string, unknown>)}`),

  recent: (limit = 10) => client.get<{ data: LibraryDocument[] }>(`/library/recent?limit=${limit}`),
  stats: () => client.get<{ data: LibraryStats }>('/library/stats'),
  search: (q: string) => client.get<{ data: LibraryDocument[] }>(`/library/search?q=${encodeURIComponent(q)}`),
  move: (documentIds: string[], folderId: string | null) =>
    client.post('/library/move', { documentIds, folderId }),
  pin: (id: string, pin: boolean) => client.post(`/library/${id}/pin`, { pin }),
  trash: (id: string) => client.post(`/library/${id}/trash`, {}),
  restore: (id: string) => client.post(`/library/${id}/restore`, {}),
  permanentDelete: (id: string) => client.delete(`/library/${id}/permanent`),
  emptyTrash: () => client.delete('/library/trash'),
  favorite: (id: string, add: boolean) => client.post(`/library/${id}/favorite`, { add }),

  // Folders
  folderTree: () => client.get<{ data: Folder[] }>('/folders/tree'),
  listFolders: (parentId?: string | null) =>
    client.get<{ data: Folder[] }>(`/folders${buildQuery({ parentId: parentId ?? undefined })}`),
  createFolder: (data: { name: string; parentId?: string; color?: string; icon?: string }) =>
    client.post<{ data: Folder }>('/folders', data),
  updateFolder: (id: string, data: { name?: string; color?: string; icon?: string; parentId?: string | null }) =>
    client.put<{ data: Folder }>(`/folders/${id}`, data),
  deleteFolder: (id: string) => client.delete(`/folders/${id}`),

  // Tags
  listTags: () => client.get<{ data: Tag[] }>('/tags'),
  createTag: (data: { name: string; color?: string }) => client.post<{ data: Tag }>('/tags', data),
  deleteTag: (id: string) => client.delete(`/tags/${id}`),
  attachTag: (documentId: string, tagId: string) => client.post('/tags/attach', { documentId, tagId }),
  detachTag: (documentId: string, tagId: string) => client.post('/tags/detach', { documentId, tagId }),
  getDocumentTags: (documentId: string) => client.get<{ data: Tag[] }>(`/tags/document/${documentId}`),

  // Comments
  listComments: (documentId: string) => client.get<{ data: Comment[] }>(`/comments/document/${documentId}`),
  createComment: (documentId: string, content: string, parentId?: string) =>
    client.post<{ data: Comment }>(`/comments/document/${documentId}`, { content, parentId }),
  updateComment: (id: string, content: string) => client.put<{ data: Comment }>(`/comments/${id}`, { content }),
  deleteComment: (id: string) => client.delete(`/comments/${id}`),
  resolveComment: (id: string) => client.post<{ data: Comment }>(`/comments/${id}/resolve`, {}),
  unresolveComment: (id: string) => client.post<{ data: Comment }>(`/comments/${id}/unresolve`, {}),

  // Approval
  submitForApproval: (documentId: string) =>
    client.post<{ data: ApprovalWorkflow }>(`/approvals/document/${documentId}/submit`, {}),
  getApprovalHistory: (documentId: string) =>
    client.get<{ data: ApprovalWorkflow[] }>(`/approvals/document/${documentId}/history`),
  getApprovalQueue: (stage?: string) =>
    client.get<{ data: ApprovalWorkflow[] }>(`/approvals/queue${stage ? `?stage=${stage}` : ''}`),
  approveWorkflow: (id: string, comments?: string) =>
    client.post(`/approvals/${id}/approve`, { comments }),
  rejectWorkflow: (id: string, comments?: string) =>
    client.post(`/approvals/${id}/reject`, { comments }),
  requestChanges: (id: string, comments: string) =>
    client.post(`/approvals/${id}/request-changes`, { comments }),

  // Share links
  createShareLink: (documentId: string, opts: {
    expiresAt?: string; allowDownload?: boolean; allowEdit?: boolean; allowComment?: boolean; password?: string
  }) => client.post<{ data: ShareLink }>(`/share/document/${documentId}`, opts),
  listShareLinks: (documentId: string) =>
    client.get<{ data: ShareLink[] }>(`/share/document/${documentId}`),
  revokeShareLink: (id: string) => client.delete(`/share/${id}`),
  validateShareLink: (token: string, password?: string) =>
    client.post<{ data: { document: LibraryDocument } }>(`/share/validate/${token}`, { password }),

  // Exports
  downloadDocument: (id: string, format = 'pdf', templateId?: string) => {
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
    const q = buildQuery({ format, templateId })
    return `${base}/exports/documents/${id}/download${q}`
  },
  queueExport: (id: string, format: string, templateId?: string) =>
    client.post<{ exportId: string }>(`/exports/documents/${id}/queue`, { format, templateId }),
  listExports: (page = 1, limit = 20) =>
    client.get<{ data: ExportRecord[]; total: number; totalPages: number }>(`/exports?page=${page}&limit=${limit}`),
  listExportTemplates: () => client.get<{ data: ExportTemplate[] }>('/exports/templates'),
  createExportTemplate: (data: Partial<ExportTemplate> & { name: string }) =>
    client.post<{ data: ExportTemplate }>('/exports/templates', data),
  deleteExportTemplate: (id: string) => client.delete(`/exports/templates/${id}`),
}
