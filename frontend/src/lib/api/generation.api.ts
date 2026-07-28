import { apiClient } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AcademicLevel = 'ND' | 'HND' | 'BSC' | 'MSC' | 'MBA' | 'PHD' | 'PROFESSIONAL'
export type BloomLevel    = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'EVALUATE' | 'CREATE'
export type Difficulty    = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
export type GeneratorType = 'lecture-notes' | 'lesson-plan' | 'assignment' | 'quiz' | 'exam' | 'marking-scheme' | 'presentation' | 'course-outline' | 'question-bank'
export type AIProvider    = 'openai' | 'anthropic' | 'gemini'
export type ExportFormat  = 'markdown' | 'pdf' | 'docx' | 'html'

export interface GenerationParams {
  topic: string
  subject?: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  academicLevel: AcademicLevel
  bloomLevel?: BloomLevel
  difficulty?: Difficulty
  wordCount?: number
  duration?: number
  teachingStyle?: string
  language?: string
  tone?: string
  referenceStyle?: string
  includeExamples?: boolean
  includeCaseStudies?: boolean
  includeExercises?: boolean
  includeReferences?: boolean
  customInstructions?: string
  sourceContext?: string
  numberOfQuestions?: number
  numberOfWeeks?: number
  provider?: AIProvider
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface GeneratedDocument {
  id: string; title: string; type: string; status: string; content: string | null
  description: string | null; tags: string[]; institutionId: string | null; courseId: string | null
  version: number; currentVersionId: string | null; isPublic: boolean
  course?: { id: string; code: string; title: string } | null
  currentVersion?: { version: number; wordCount: number; markdownContent?: string } | null
  aiGeneration?: { provider: string; model: string; tokensInput: number; tokensOutput: number; durationMs: number } | null
  versions?: DocumentVersion[]
  exports?: ExportRecord[]
  _count?: { versions: number; exports: number }
  createdAt: string; updatedAt: string
}

export interface DocumentVersion {
  id: string; documentId: string; version: number
  markdownContent: string; htmlContent: string | null
  wordCount: number; tokenUsage: number; generationTime: number; prompt: string | null
  createdBy: string; createdAt: string
  creator?: { id: string; name: string; avatarUrl?: string | null }
}

export interface AIGenerationRecord {
  id: string; moduleType: string; provider: string; model: string
  tokensInput: number; tokensOutput: number; durationMs: number; createdAt: string
  document?: { id: string; title: string; type: string; status: string } | null
}

export interface GenerationStats {
  todayCount: number; totalCount: number; avgGenerationTime: number
  moduleBreakdown: Array<{ moduleType: string; _count: number }>
  recentActivity: Array<AIGenerationRecord>
  tokenUsage: { input: number; output: number; totalCostUsd: number }
}

export interface PromptTemplate {
  id: string; institutionId: string | null; name: string; category: string
  prompt: string; systemPrompt: string | null; variables: unknown[]; isDefault: boolean; isPublic: boolean
  createdBy: string; createdAt: string; updatedAt: string
  creator?: { id: string; name: string; avatarUrl?: string | null }
}

export interface ExportRecord {
  id: string; documentId: string; userId: string; format: string; status: string
  fileUrl: string | null; createdAt: string
}

export interface Paginated<T> { data: T[]; total: number; page: number; totalPages: number }

// ── Streaming helper ──────────────────────────────────────────────────────────

export interface StreamCallbacks {
  onChunk: (chunk: string) => void
  onDone: (documentId: string, tokensUsed: number) => void
  onError: (error: string) => void
  signal?: AbortSignal
}

export async function streamGeneration(type: GeneratorType, params: GenerationParams, callbacks: StreamCallbacks): Promise<void> {
  const { onChunk, onDone, onError, signal } = callbacks

  const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string
  const response = await fetch(`${base}/generate/${type}/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
    },
    body: JSON.stringify(params),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Generation failed' })) as { message?: string }
    onError(err.message ?? 'Generation failed')
    return
  }

  if (!response.body) { onError('No response body'); return }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    for (const line of decoder.decode(value, { stream: true }).split('\n')) {
      if (!line.startsWith('data: ')) continue
      try {
        const parsed = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; documentId?: string; tokensUsed?: number; error?: string }
        if (parsed.error) { onError(parsed.error); return }
        if (parsed.chunk) onChunk(parsed.chunk)
        if (parsed.done && parsed.documentId) onDone(parsed.documentId, parsed.tokensUsed ?? 0)
      } catch { /* skip malformed */ }
    }
  }
}

// ── REST API helpers ──────────────────────────────────────────────────────────

const get  = <T>(url: string) => apiClient.get<T>(url).then((r) => r.data)
const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)
const put  = <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data)
const del  = (url: string) => apiClient.delete(url)

function qs(q?: Record<string, string | number | boolean | undefined>): string {
  if (!q) return ''
  const p = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

const BASE = '/generate'

export const generationApi = {
  // History & stats
  getHistory: (filters?: { page?: number; limit?: number; moduleType?: string; search?: string }) =>
    get<{ status: string; data: AIGenerationRecord[]; total: number; page: number; totalPages: number }>(`${BASE}/history${qs(filters as Record<string, string | number | boolean | undefined>)}`),
  getStats: () =>
    get<{ status: string; data: GenerationStats }>(`${BASE}/stats`),

  // Document management
  listDocuments: (filters?: { page?: number; limit?: number; type?: string; status?: string; search?: string; courseId?: string }) =>
    get<{ status: string; data: GeneratedDocument[]; total: number; page: number; totalPages: number }>(`${BASE}/documents${qs(filters as Record<string, string | number | boolean | undefined>)}`),
  getDocument: (id: string) =>
    get<{ status: string; data: GeneratedDocument }>(`${BASE}/documents/${id}`),
  updateDocument: (id: string, data: { title?: string; description?: string; status?: string; tags?: string[]; content?: string }) =>
    put<{ status: string; data: GeneratedDocument }>(`${BASE}/documents/${id}`, data),
  deleteDocument: (id: string) => del(`${BASE}/documents/${id}`),

  // Versions
  listVersions: (documentId: string) =>
    get<{ status: string; data: DocumentVersion[] }>(`${BASE}/documents/${documentId}/versions`),
  createVersion: (documentId: string, content: string, prompt?: string) =>
    post<{ status: string; data: DocumentVersion }>(`${BASE}/documents/${documentId}/versions`, { content, prompt }),
  restoreVersion: (documentId: string, versionId: string) =>
    post<{ status: string; data: DocumentVersion }>(`${BASE}/documents/${documentId}/versions/${versionId}/restore`),

  // Export
  exportDocument: (documentId: string, format: ExportFormat) =>
    post<{ status: string; exportId: string }>(`${BASE}/documents/${documentId}/export`, { format }),
}

// Templates API
export const templateApi = {
  list: (category?: string) =>
    get<{ status: string; data: PromptTemplate[] }>(`/templates${qs(category ? { category } : undefined)}`),
  get: (id: string) =>
    get<{ status: string; data: PromptTemplate }>(`/templates/${id}`),
  create: (data: Partial<PromptTemplate>) =>
    post<{ status: string; data: PromptTemplate }>('/templates', data),
  update: (id: string, data: Partial<PromptTemplate>) =>
    put<{ status: string; data: PromptTemplate }>(`/templates/${id}`, data),
  delete: (id: string) => del(`/templates/${id}`),
}
