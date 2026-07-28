import { apiClient as api } from './client'

export const calendarApi = {
  create: (data: {
    title: string; eventType: string; startAt: string; endAt: string
    description?: string; allDay?: boolean; location?: string; meetingUrl?: string
    attendees?: string[]; workspaceId?: string; color?: string; recurrence?: unknown
  }) => api.post('/calendar', data),

  list: (params?: { from?: string; to?: string; workspaceId?: string; eventType?: string }) =>
    api.get('/calendar', { params }),

  getUpcoming: (limit?: number) => api.get('/calendar/upcoming', { params: { limit } }),

  get: (id: string) => api.get(`/calendar/${id}`),

  update: (id: string, data: object) => api.patch(`/calendar/${id}`, data),

  delete: (id: string) => api.delete(`/calendar/${id}`),
}
