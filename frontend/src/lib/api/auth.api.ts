import { apiClient } from './client'
import type { UserRole } from '@/types/roles.types'

// Registration accepts the backend's Prisma UserRole enum values (uppercase),
// distinct from the lowercase `UserRole` slug type used for permission checks.
export type RegisterRole =
  | 'STUDENT' | 'TEACHING_ASSISTANT' | 'LECTURER'
  | 'DEPARTMENT_HEAD' | 'DEAN' | 'UNIVERSITY_ADMIN' | 'ADMINISTRATOR'

export interface AuthTokens { accessToken: string; refreshToken: string }

export interface AuthUser {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  email: string
  role: UserRole
  roleSlug: string
  status: string
  emailVerified: boolean
  department: string | null
  faculty: string | null
  title: string | null
  avatarUrl: string | null
  bio: string | null
  institutionId: string | null
  lastLogin: string | null
  personalInstitutionName:    string | null
  personalInstitutionMotto:   string | null
  personalInstitutionLogoUrl: string | null
  personalInstitutionType:    string | null
}

export interface AuthInstitution {
  id: string
  name: string
  logo: string | null
  planTier: string
  institutionType?: string | null
}

export interface LoginResponse { user: AuthUser; tokens: AuthTokens; institution: AuthInstitution | null }
export interface MeResponse    { user: AuthUser; institution: AuthInstitution | null; roles: { slug: string; name: string }[] }

export const authApi = {
  registerInstitution: (payload: {
    institution: { name: string; country?: string; timezone?: string; domain?: string }
    owner: { firstName: string; lastName: string; email: string; password: string }
  }) => apiClient.post<{ user: AuthUser; institution: AuthInstitution }>('/auth/register-institution', payload).then((r) => r.data),

  register: (payload: { name: string; email: string; password: string; role?: RegisterRole; institutionId?: string; matricNumber?: string }) =>
    apiClient.post<LoginResponse>('/auth/register', payload).then((r) => r.data),

  login: (payload: { email: string; password: string }) =>
    apiClient.post<LoginResponse>('/auth/login', payload).then((r) => r.data),

  logout: () => apiClient.post('/auth/logout'),

  refresh: () => apiClient.post<AuthTokens>('/auth/refresh').then((r) => r.data),

  me: () => apiClient.get<MeResponse>('/auth/me').then((r) => r.data),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    apiClient.post('/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),

  updateProfile: (data: { name?: string; firstName?: string; lastName?: string; department?: string; faculty?: string; title?: string; bio?: string; personalInstitutionName?: string; personalInstitutionMotto?: string; personalInstitutionType?: string }) =>
    apiClient.put<{ user: AuthUser }>('/auth/profile', data).then((r) => r.data),

  uploadInstitutionLogo: (file: File) => {
    const fd = new FormData()
    fd.append('institution-logo', file)
    return apiClient.post<{ logoUrl: string }>('/auth/institution-logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return apiClient.post<{ avatarUrl: string }>('/auth/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/password', { currentPassword, newPassword }),

  getSessions: () =>
    apiClient.get<{ sessions: unknown[] }>('/auth/sessions').then((r) => r.data),

  terminateSession: (sessionId: string) =>
    apiClient.delete(`/auth/sessions/${sessionId}`),

  terminateAllSessions: () =>
    apiClient.delete('/auth/sessions'),
}
