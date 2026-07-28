import { apiClient } from './client'
import type { AIProviderID, AIModuleType } from '@/constants/ai.constants'

export interface AIGeneratePayload {
  moduleType: AIModuleType
  provider?: AIProviderID
  model?: string
  prompt: string
  courseId?: string
  options?: Record<string, unknown>
}

export interface AIGenerateResponse {
  content: string
  tokensInput: number
  tokensOutput: number
  model: string
  provider: AIProviderID
  documentId?: string
}

export interface AIJobResponse {
  jobId: string
  status: 'queued' | 'active' | 'completed' | 'failed'
  documentId?: string
  error?: string
}

export interface AIUsageSummary {
  totalTokensInput: number
  totalTokensOutput: number
  totalCostUsd: number
  byProvider: Record<string, number>
  byModule: Record<string, number>
}

export const aiApi = {
  generate: (payload: AIGeneratePayload) =>
    apiClient.post<AIGenerateResponse>('/ai/generate', payload).then((r) => r.data),

  generateAsync: (payload: AIGeneratePayload) =>
    apiClient.post<{ jobId: string }>('/ai/generate-async', payload).then((r) => r.data),

  getJobStatus: (jobId: string) =>
    apiClient.get<AIJobResponse>(`/ai/jobs/${jobId}`).then((r) => r.data),

  getHistory: (params?: { page?: number; pageSize?: number; moduleType?: AIModuleType }) =>
    apiClient.get('/ai/history', { params }).then((r) => r.data),

  getUsage: () =>
    apiClient.get<AIUsageSummary>('/ai/usage').then((r) => r.data),

  streamGenerate: (_payload: AIGeneratePayload): EventSource => {
    const token = localStorage.getItem('accessToken')
    const url = new URL(`${apiClient.defaults.baseURL}/ai/stream`)
    const es = new EventSource(url.toString(), {
      // EventSource does not natively support headers; use query param for auth
    })
    // For SSE with auth, POST then SSE — handled differently per Phase 7
    void token
    return es
  },
}
