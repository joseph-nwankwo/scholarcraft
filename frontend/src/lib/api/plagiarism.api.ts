import { apiClient } from './client'

export type CheckType   = 'ai' | 'plagiarism'
export type RiskLevel   = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
export type SectionFlag = 'ai_likely' | 'suspicious' | 'clean'

export interface PlagiarismSection { text: string; flag: SectionFlag; reason: string }

export interface PlagiarismResult {
  aiScore: number
  originalityScore: number
  riskLevel: RiskLevel
  wordCount: number
  summary: string
  aiIndicators: string[]
  originalityIndicators: string[]
  sections: PlagiarismSection[]
  recommendations: string[]
  checkedAt: string
  title?: string
}

export const plagiarismApi = {
  check: (data: { text: string; title?: string; checks?: CheckType[] }) =>
    apiClient.post<{ status: string; data: PlagiarismResult }>('/plagiarism/check', data, { timeout: 60_000 }).then((r) => r.data.data),
}
