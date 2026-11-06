import { apiClient } from './client'

export interface Flashcard {
  front: string
  back: string
}

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const ALLOWED_STUDY_UPLOAD_ACCEPT = '.pdf,.doc,.docx,.txt,.md'

export const studyToolsApi = {
  extractText: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient
      .post<{ text: string }>('/study-tools/extract-text', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      })
      .then((r) => r.data.text)
  },


  generateFlashcards: (data: { topic?: string; sourceText?: string; count?: number; academicLevel?: string }) =>
    apiClient.post<{ cards: Flashcard[] }>('/study-tools/flashcards', data, { timeout: 120_000 }).then((r) => r.data.cards),

  summarize: (data: { text: string; length?: 'short' | 'medium' | 'long'; academicLevel?: string }) =>
    apiClient.post<{ summary: string }>('/study-tools/summarize', data, { timeout: 120_000 }).then((r) => r.data.summary),

  generateQuiz: (data: { topic?: string; sourceText?: string; count?: number; academicLevel?: string }) =>
    apiClient.post<{ questions: QuizQuestion[] }>('/study-tools/quiz', data, { timeout: 120_000 }).then((r) => r.data.questions),
}
