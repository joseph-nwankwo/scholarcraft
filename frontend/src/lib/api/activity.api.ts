import { apiClient as api } from './client'

export const activityApi = {
  getInstitutionFeed: (params?: { page?: number; limit?: number; actorId?: string; entityType?: string }) =>
    api.get('/activity', { params }),

  getWorkspaceFeed: (workspaceId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/activity/workspace/${workspaceId}`, { params }),

  getUserFeed: (userId?: string, params?: { page?: number; limit?: number }) =>
    api.get(userId ? `/activity/user/${userId}` : '/activity/user', { params }),
}
