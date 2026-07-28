import { apiClient as api } from './client'

export const messagingApi = {
  getOrCreateDirect: (targetUserId: string) =>
    api.post('/conversations/direct', { targetUserId }),

  createGroup: (data: { name: string; description?: string; memberIds: string[]; workspaceId?: string; type?: string }) =>
    api.post('/conversations/group', data),

  getConversations: (params?: { page?: number; limit?: number }) =>
    api.get('/conversations', { params }),

  getConversation: (id: string) => api.get(`/conversations/${id}`),

  markRead: (id: string) => api.post(`/conversations/${id}/read`),

  mute: (id: string, muted: boolean) => api.patch(`/conversations/${id}/mute`, { muted }),

  archive: (id: string, archived: boolean) =>
    api.patch(`/conversations/${id}/archive`, { archived }),

  addMembers: (id: string, userIds: string[]) =>
    api.post(`/conversations/${id}/members`, { userIds }),

  getMessages: (conversationId: string, params?: { limit?: number; before?: string; threadId?: string }) =>
    api.get(`/messages/${conversationId}`, { params }),

  sendMessage: (data: {
    conversationId: string; content: string; messageType?: string
    attachments?: unknown[]; threadId?: string
  }) => api.post('/messages', data),

  editMessage: (id: string, content: string) =>
    api.patch(`/messages/${id}`, { content }),

  deleteMessage: (id: string) => api.delete(`/messages/${id}`),

  reactToMessage: (id: string, emoji: string) =>
    api.post(`/messages/${id}/react`, { emoji }),

  pinMessage: (id: string, conversationId: string) =>
    api.post(`/messages/${id}/pin`, { conversationId }),

  searchMessages: (q: string, limit?: number) =>
    api.get('/messages/search', { params: { q, limit } }),
}
