import axios from 'axios'

const API = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api' })
API.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeSeriesPoint { date: string; value: number }

export interface LecturerDashboard {
  summary: {
    totalDocs: number; docsThisPeriod: number; questionsCount: number
    assessmentsCount: number; pendingApprovals: number; approvalRate: number | null
    tokensUsed: number; aiCostUsd: number; aiGenerations: number
  }
  docsByType: Array<{ type: string; count: number }>
  aiSeries: TimeSeriesPoint[]
  docSeries: TimeSeriesPoint[]
  recentDocs: Array<{ id: string; title: string; type: string; status: string; createdAt: string }>
}

export interface DepartmentDashboard {
  summary: {
    lecturersCount: number; totalDocs: number; docsThisPeriod: number
    totalQuestions: number; approvedQuestions: number
    pendingModeration: number; pendingApprovals: number
    tokensUsed: number; aiCostUsd: number; aiGenerations: number
  }
  docsByType: Array<{ type: string; count: number }>
  teachingLoad: Array<{ name: string; role: string; documents: number; questions: number; aiGenerations: number }>
}

export interface InstitutionDashboard {
  summary: {
    activeUsers: number; totalUsers: number; newUsersThisPeriod: number
    totalDocs: number; docsThisPeriod: number
    totalQuestions: number; totalAssessments: number; pendingApprovals: number
    tokensUsed: number; aiCostUsd: number; aiCostChange: number | null; aiGenerations: number
  }
  docsByStatus: Array<{ status: string; count: number }>
  usersByRole: Array<{ role: string; count: number }>
  aiByProvider: Array<{ provider: string; generations: number; tokens: number; costUsd: number }>
  growthSeries: TimeSeriesPoint[]
}

export interface AIUsageStats {
  aggregate: {
    totalGenerations: number; tokensInput: number; tokensOutput: number
    totalTokens: number; costUsd: number; avgCostPerGeneration: number
  }
  byProvider: Array<{ provider: string; generations: number; tokens: number; costUsd: number }>
  byModule: Array<{ moduleType: string; generations: number; tokens: number; costUsd: number }>
  timeSeries: TimeSeriesPoint[]
  costSeries: TimeSeriesPoint[]
}

export interface AssessmentStats {
  questions: {
    total: number
    byType: Array<{ type: string; count: number }>
    byBloom: Array<{ level: string; count: number }>
    byDifficulty: Array<{ difficulty: string; count: number }>
    byModeration: Array<{ status: string; count: number }>
  }
  assessments: {
    total: number
    byType: Array<{ type: string; count: number }>
    byStatus: Array<{ status: string; count: number }>
  }
  rubrics: number
  outcomes: number
}

export interface FacultyDashboard {
  summary: {
    departmentsCount: number
    lecturersCount: number
    totalDocs: number
    assessments: number
    tokensUsed: number
    aiCostUsd: number
  }
  deptBreakdown: Array<{
    department: string
    lecturers: number
    documents: number
    questions: number
    aiGenerations: number
  }>
}

export interface DocumentStats {
  total: number; createdThisPeriod: number
  byType: Array<{ type: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  approvalStats: Array<{ status: string; count: number }>
  timeSeries: TimeSeriesPoint[]
}

export interface BloomCoverage {
  distribution: Array<{ level: string; count: number; percentage: number }>
  total: number
  missingLevels: string[]
  coverageScore: number
}

export interface ProductivityEntry {
  userId: string; name: string; department: string | null
  documents: number; questions: number; aiGenerations: number
}

export interface ReportTemplate {
  id: string; name: string; description?: string; category: string
  config: Record<string, unknown>; isDefault: boolean; isPublic: boolean
  creator: { name: string }; createdAt: string
}

export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEMESTER' | 'ACADEMIC_SESSION'
export type ReportFormat = 'PDF' | 'CSV' | 'EXCEL' | 'WORD'

export interface ScheduledReport {
  id: string; name: string; frequency: ReportFrequency; format: ReportFormat
  recipients: string[]; isActive: boolean; lastRunAt?: string; nextRunAt?: string
  template?: { name: string } | null
  creator: { name: string }; createdAt: string
}

// ── Date range helper ─────────────────────────────────────────────────────────
export interface DateRangeFilter { from?: string; to?: string }

function dateParams(range?: DateRangeFilter) {
  return range ? { from: range.from, to: range.to } : {}
}

// ── API client ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  // Dashboard (role-adaptive)
  getDashboard(range?: DateRangeFilter, extra?: Record<string, string>) {
    return API.get<{ data: unknown }>('/analytics/dashboard', { params: { ...dateParams(range), ...extra } })
      .then((r) => r.data.data)
  },

  getLecturerDashboard(userId: string, range?: DateRangeFilter) {
    return API.get<{ data: LecturerDashboard }>(`/analytics/lecturer/${userId}`, { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  getDepartmentDashboard(department: string, range?: DateRangeFilter) {
    return API.get<{ data: DepartmentDashboard }>('/analytics/department', { params: { department, ...dateParams(range) } })
      .then((r) => r.data.data)
  },

  getInstitutionDashboard(range?: DateRangeFilter) {
    return API.get<{ data: InstitutionDashboard }>('/analytics/institution', { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  getAIUsageStats(range?: DateRangeFilter) {
    return API.get<{ data: AIUsageStats }>('/analytics/ai-usage', { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  getDocumentStats(range?: DateRangeFilter) {
    return API.get<{ data: DocumentStats }>('/analytics/documents', { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  getAssessmentStats(courseId?: string) {
    return API.get<{ data: AssessmentStats }>('/analytics/assessments', { params: courseId ? { courseId } : {} })
      .then((r) => r.data.data)
  },

  getApprovalStats(range?: DateRangeFilter) {
    return API.get<{ data: { total: number; approvalRate: number; byStatus: Array<{ status: string; count: number }> } }>('/analytics/approvals', { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  getBloomCoverage(courseId?: string) {
    return API.get<{ data: BloomCoverage }>('/analytics/bloom', { params: courseId ? { courseId } : {} })
      .then((r) => r.data.data)
  },

  getProductivity(range?: DateRangeFilter) {
    return API.get<{ data: ProductivityEntry[] }>('/analytics/productivity', { params: dateParams(range) })
      .then((r) => r.data.data)
  },

  trackEvent(payload: { eventType: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown> }) {
    return API.post('/analytics/events', payload)
  },

  // Reports — Templates
  listTemplates() {
    return API.get<{ data: ReportTemplate[] }>('/reports/templates').then((r) => r.data.data)
  },
  createTemplate(data: { name: string; description?: string; category: string; isPublic?: boolean; config?: object }) {
    return API.post<{ data: ReportTemplate }>('/reports/templates', data).then((r) => r.data.data)
  },
  deleteTemplate(id: string) {
    return API.delete(`/reports/templates/${id}`)
  },

  // Reports — Scheduled
  listScheduled() {
    return API.get<{ data: ScheduledReport[] }>('/reports/scheduled').then((r) => r.data.data)
  },
  createScheduled(data: {
    name: string; frequency: ReportFrequency; format?: ReportFormat
    recipients: string[]; filters?: object; templateId?: string; isActive?: boolean
  }) {
    return API.post<{ data: ScheduledReport }>('/reports/scheduled', data).then((r) => r.data.data)
  },
  updateScheduled(id: string, data: Partial<{ name: string; frequency: ReportFrequency; format: ReportFormat; isActive: boolean; recipients: string[] }>) {
    return API.patch<{ data: ScheduledReport }>(`/reports/scheduled/${id}`, data).then((r) => r.data.data)
  },
  deleteScheduled(id: string) {
    return API.delete(`/reports/scheduled/${id}`)
  },

  // Report generation — returns a URL to trigger download
  generateReportUrl(type: 'teaching' | 'assessment' | 'ai-usage' | 'institution', format: 'pdf' | 'csv', range?: DateRangeFilter) {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
    const token = localStorage.getItem('accessToken') ?? ''
    const params = new URLSearchParams({ format, ...(range?.from ? { from: range.from } : {}), ...(range?.to ? { to: range.to } : {}), _t: token })
    return `${base}/reports/generate/${type}?${params}`
  },

  // AI Insights
  getLecturerInsights() {
    return API.get<{ data: string }>('/insights/lecturer').then((r) => r.data.data)
  },
  getInstitutionInsights() {
    return API.get<{ data: string }>('/insights/institution').then((r) => r.data.data)
  },
  getBloomInsights(courseId?: string) {
    return API.get<{ data: string }>('/insights/bloom', { params: courseId ? { courseId } : {} }).then((r) => r.data.data)
  },
  getAssessmentInsights() {
    return API.get<{ data: string }>('/insights/assessment').then((r) => r.data.data)
  },
}
