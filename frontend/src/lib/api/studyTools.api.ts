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

export const studyToolsApi = {
  generateFlashcards: (data: { topic?: string; sourceText?: string; count?: number }) =>
    apiClient.post<{ cards: Flashcard[] }>('/study-tools/flashcards', data, { timeout: 120_000 }).then((r) => r.data.cards),

  summarize: (data: { text: string; length?: 'short' | 'medium' | 'long' }) =>
    apiClient.post<{ summary: string }>('/study-tools/summarize', data, { timeout: 120_000 }).then((r) => r.data.summary),

  generateQuiz: (data: { topic?: string; sourceText?: string; count?: number }) =>
    apiClient.post<{ questions: QuizQuestion[] }>('/study-tools/quiz', data, { timeout: 120_000 }).then((r) => r.data.questions),
}
