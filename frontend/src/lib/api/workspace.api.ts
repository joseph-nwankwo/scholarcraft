import { apiClient as api } from './client'

export const workspaceApi = {
  create: (data: { name: string; description?: string; visibility?: string }) =>
    api.post('/workspaces', data),

  list: (params?: { page?: number; limit?: number }) =>
    api.get('/workspaces', { params }),

  get: (id: string) => api.get(`/workspaces/${id}`),

  getDashboard: (id: string) => api.get(`/workspaces/${id}/dashboard`),

  update: (id: string, data: object) => api.patch(`/workspaces/${id}`, data),

  delete: (id: string) => api.delete(`/workspaces/${id}`),

  getMembers: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/workspaces/${id}/members`, { params }),

  addMember: (id: string, data: { userId: string; role?: string }) =>
    api.post(`/workspaces/${id}/members`, data),

  removeMember: (id: string, userId: string) =>
    api.delete(`/workspaces/${id}/members/${userId}`),

  updateMemberRole: (id: string, userId: string, role: string) =>
    api.patch(`/workspaces/${id}/members/${userId}/role`, { role }),
}
