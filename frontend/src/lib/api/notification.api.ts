import { apiClient as api } from './client'

export const notificationApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean; category?: string; archived?: boolean }) =>
    api.get('/notifications', { params }),

  getUnreadCount: () => api.get('/notifications/count'),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: (category?: string) => api.patch('/notifications/read-all', { category }),

  archive: (id: string) => api.patch(`/notifications/${id}/archive`),

  pin: (id: string) => api.patch(`/notifications/${id}/pin`),

  delete: (id: string) => api.delete(`/notifications/${id}`),

  getMentions: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications/mentions', { params }),

  markMentionRead: (id: string) => api.patch(`/notifications/mentions/${id}/read`),
}
