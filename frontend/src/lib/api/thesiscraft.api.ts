import { apiClient } from './client'

export type ThesisStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETE'
export type ChapterStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'
export type CitationType = 'JOURNAL' | 'BOOK' | 'WEBSITE' | 'CONFERENCE' | 'THESIS' | 'OTHER'

export interface ThesisChapter {
  id: string
  title: string
  order: number
  content: string | null
  status: ChapterStatus
  createdAt: string
  updatedAt: string
}

export interface ThesisCitation {
  id: string
  type: CitationType
  authors: string
  year: number | null
  title: string
  source: string | null
  url: string | null
  createdAt: string
  updatedAt: string
}

export interface Thesis {
  id: string
  title: string
  field: string | null
  degreeType: string | null
  supervisorName: string | null
  status: ThesisStatus
  proposalSections: Record<string, string>
  assistantDocument: string | null
  chapters: ThesisChapter[]
  citations: ThesisCitation[]
  createdAt: string
  updatedAt: string
}

export interface ThesisSummary extends Omit<Thesis, 'chapters' | 'citations' | 'proposalSections'> {
  _count: { chapters: number; citations: number }
}

export type ReferenceDocumentStatus = 'PROCESSING' | 'READY' | 'FAILED'

export interface ThesisReferenceDocument {
  id: string
  fileName: string
  fileUrl: string
  fileType: string
  status: ReferenceDocumentStatus
  errorMessage: string | null
  chunkCount: number
  createdAt: string
}

export interface ReferenceChunkMatch {
  content: string
  documentName: string
  score: number
}

export interface LiteratureResult {
  provider: 'crossref' | 'semanticscholar'
  title: string
  authors: string
  year: number | null
  venue: string | null
  publisher: string | null
  url: string | null
  doi: string | null
  origin: 'local' | 'foreign' | 'unknown'
}

export const thesiscraftApi = {
  listTheses: () =>
    apiClient.get<{ theses: ThesisSummary[] }>('/thesiscraft/theses').then((r) => r.data.theses),

  createThesis: (data: { title: string; field?: string; degreeType?: string; supervisorName?: string }) =>
    apiClient.post<{ thesis: Thesis }>('/thesiscraft/theses', data).then((r) => r.data.thesis),

  getThesis: (id: string) =>
    apiClient.get<{ thesis: Thesis }>(`/thesiscraft/theses/${id}`).then((r) => r.data.thesis),

  updateThesis: (id: string, data: Partial<{ title: string; field: string; degreeType: string; supervisorName: string; status: ThesisStatus; assistantDocument: string | null }>) =>
    apiClient.patch<{ thesis: Thesis }>(`/thesiscraft/theses/${id}`, data).then((r) => r.data.thesis),

  deleteThesis: (id: string) => apiClient.delete(`/thesiscraft/theses/${id}`),

  updateProposal: (id: string, sections: Record<string, string>) =>
    apiClient.patch<{ thesis: Thesis }>(`/thesiscraft/theses/${id}/proposal`, { sections }).then((r) => r.data.thesis),

  createChapter: (thesisId: string, data: { title: string }) =>
    apiClient.post<{ chapter: ThesisChapter }>(`/thesiscraft/theses/${thesisId}/chapters`, data).then((r) => r.data.chapter),

  updateChapter: (id: string, data: Partial<{ title: string; content: string | null; status: ChapterStatus; order: number }>) =>
    apiClient.patch<{ chapter: ThesisChapter }>(`/thesiscraft/chapters/${id}`, data).then((r) => r.data.chapter),

  deleteChapter: (id: string) => apiClient.delete(`/thesiscraft/chapters/${id}`),

  createCitation: (thesisId: string, data: { type?: CitationType; authors: string; year?: number | null; title: string; source?: string; url?: string }) =>
    apiClient.post<{ citation: ThesisCitation }>(`/thesiscraft/theses/${thesisId}/citations`, data).then((r) => r.data.citation),

  updateCitation: (id: string, data: Partial<{ type: CitationType; authors: string; year: number | null; title: string; source: string; url: string }>) =>
    apiClient.patch<{ citation: ThesisCitation }>(`/thesiscraft/citations/${id}`, data).then((r) => r.data.citation),

  deleteCitation: (id: string) => apiClient.delete(`/thesiscraft/citations/${id}`),

  generateProposalSection: (thesisId: string, sectionLabel: string, instructions?: string) =>
    apiClient.post<{ content: string }>('/thesiscraft/ai/proposal-section', { thesisId, sectionLabel, instructions }, { timeout: 60_000 }).then((r) => r.data.content),

  generateChapterDraft: (thesisId: string, chapterTitle: string, instructions?: string) =>
    apiClient.post<{ content: string }>('/thesiscraft/ai/chapter-draft', { thesisId, chapterTitle, instructions }, { timeout: 120_000 }).then((r) => r.data.content),

  getOriginalityCoaching: (passage: string, reason?: string, flagType?: 'ai_likely' | 'suspicious') =>
    apiClient.post<{ guidance: string }>('/thesiscraft/ai/originality-coaching', { passage, reason, flagType }, { timeout: 60_000 }).then((r) => r.data.guidance),

  // Reference library (RAG)
  uploadReferences: (thesisId: string, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return apiClient.post<{ documents: ThesisReferenceDocument[] }>(
      `/thesiscraft/theses/${thesisId}/references`, form,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180_000 }
    ).then((r) => r.data.documents)
  },

  listReferences: (thesisId: string) =>
    apiClient.get<{ documents: ThesisReferenceDocument[] }>(`/thesiscraft/theses/${thesisId}/references`).then((r) => r.data.documents),

  deleteReference: (id: string) => apiClient.delete(`/thesiscraft/references/${id}`),

  searchReferences: (thesisId: string, query: string) =>
    apiClient.post<{ results: ReferenceChunkMatch[] }>(`/thesiscraft/theses/${thesisId}/references/search`, { query }, { timeout: 30_000 }).then((r) => r.data.results),

  // Literature search — CrossRef + Semantic Scholar
  literatureSearch: (query: string, preferLocal?: boolean) =>
    apiClient.get<{ results: LiteratureResult[]; country: string; note: string }>('/thesiscraft/literature-search', { params: { query, preferLocal }, timeout: 30_000 }).then((r) => r.data),
}
