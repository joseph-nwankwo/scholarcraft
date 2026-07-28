import { client } from './client'

export type QuestionType = 'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'TRUE_FALSE' | 'FILL_BLANK' | 'MATCHING' | 'ESSAY' | 'CALCULATION'
export type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'EVALUATE' | 'CREATE'
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD'
export type ModerationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'
export type AssessmentType = 'QUIZ' | 'EXAM' | 'ASSIGNMENT' | 'PRACTICE' | 'SURVEY'
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface QuestionOption {
  id?: string
  text: string
  isCorrect: boolean
  explanation?: string
  orderIndex?: number
}

export interface Question {
  id: string
  type: QuestionType
  bloomLevel: BloomLevel
  difficulty: DifficultyLevel
  topic: string | null
  subject: string | null
  text: string
  explanation: string | null
  marks: number
  timeSeconds: number | null
  tags: string[]
  isPublic: boolean
  moderationStatus: ModerationStatus
  courseId: string | null
  institutionId: string | null
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string }
  options: QuestionOption[]
  course?: { id: string; code: string; title: string } | null
  _count?: { assessmentQs: number; outcomeMappings: number }
}

export interface Assessment {
  id: string
  title: string
  description: string | null
  type: AssessmentType
  status: AssessmentStatus
  totalMarks: number
  passMark: number | null
  durationMins: number | null
  instructions: string | null
  shuffleQs: boolean
  showAnswers: boolean
  openDate: string | null
  dueDate: string | null
  allowLate: boolean
  courseId: string | null
  rubricId: string | null
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string }
  course?: { id: string; code: string; title: string } | null
  _count?: { questions: number }
}

export interface AssessmentDetail extends Assessment {
  questions: Array<{
    id: string
    orderIndex: number
    marks: number | null
    required: boolean
    question: Question
  }>
  rubric?: Rubric | null
  outcomeMaps?: Array<{ outcome: LearningOutcome }>
}

export interface RubricLevel {
  label: string
  description: string
  points: number
}

export interface RubricCriterion {
  id: string
  title: string
  description: string | null
  maxPoints: number
  orderIndex: number
  levels: RubricLevel[]
}

export interface Rubric {
  id: string
  title: string
  description: string | null
  totalPoints: number
  isPublic: boolean
  courseId: string | null
  criteria: RubricCriterion[]
  creator: { id: string; name: string }
  course?: { id: string; code: string; title: string } | null
  _count?: { assessments: number }
  createdAt: string
  updatedAt: string
}

export interface LearningOutcome {
  id: string
  code: string | null
  description: string
  bloomLevel: BloomLevel
  category: string | null
  courseId: string | null
  creator: { id: string; name: string }
  _count?: { questionMaps: number; assessmentMaps: number }
  createdAt: string
  updatedAt: string
}

export interface QuestionModeration {
  id: string
  questionId: string
  status: ModerationStatus
  feedback: string | null
  reviewedAt: string | null
  reviewer?: { id: string; name: string } | null
  question?: Partial<Question>
}

export interface QuestionStats {
  total: number
  byType: Array<{ type: QuestionType; _count: number }>
  byBloom: Array<{ bloomLevel: BloomLevel; _count: number }>
  byDifficulty: Array<{ difficulty: DifficultyLevel; _count: number }>
  byModeration: Array<{ moderationStatus: ModerationStatus; _count: number }>
}

function buildQuery(params: Record<string, unknown>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

export const assessmentApi = {
  // Question Bank
  listQuestions: (params?: Partial<{
    type: QuestionType; bloomLevel: BloomLevel; difficulty: DifficultyLevel;
    topic: string; moderationStatus: ModerationStatus; courseId: string;
    search: string; isPublic: boolean; page: number; limit: number
  }>) => client.get<{ data: Question[]; total: number; totalPages: number }>(`/questions${buildQuery(params ?? {})}`),

  getQuestion: (id: string) => client.get<{ data: Question }>(`/questions/${id}`),
  createQuestion: (dto: Partial<Question> & { text: string; type: QuestionType; options?: QuestionOption[] }) =>
    client.post<{ data: Question }>('/questions', dto),
  updateQuestion: (id: string, dto: Partial<Question> & { options?: QuestionOption[] }) =>
    client.put<{ data: Question }>(`/questions/${id}`, dto),
  deleteQuestion: (id: string) => client.delete(`/questions/${id}`),
  bulkDeleteQuestions: (ids: string[]) => client.post('/questions/bulk-delete', { ids }),
  duplicateQuestion: (id: string) => client.post<{ data: Question }>(`/questions/${id}/duplicate`, {}),
  importQuestions: (questions: Array<Partial<Question> & { text: string; type: QuestionType }>) =>
    client.post<{ created: number }>('/questions/import', { questions }),
  questionStats: () => client.get<{ data: QuestionStats }>('/questions/stats'),
  mapQuestionOutcome: (id: string, outcomeId: string) => client.post(`/questions/${id}/outcomes/${outcomeId}`, {}),
  unmapQuestionOutcome: (id: string, outcomeId: string) => client.delete(`/questions/${id}/outcomes/${outcomeId}`),

  // Assessments
  listAssessments: (params?: Partial<{
    type: AssessmentType; status: AssessmentStatus; courseId: string; search: string; page: number; limit: number
  }>) => client.get<{ data: Assessment[]; total: number; totalPages: number }>(`/assessments${buildQuery(params ?? {})}`),

  getAssessment: (id: string) => client.get<{ data: AssessmentDetail }>(`/assessments/${id}`),
  createAssessment: (dto: Partial<Assessment> & { title: string }) =>
    client.post<{ data: Assessment }>('/assessments', dto),
  updateAssessment: (id: string, dto: Partial<Assessment>) =>
    client.put<{ data: Assessment }>(`/assessments/${id}`, dto),
  deleteAssessment: (id: string) => client.delete(`/assessments/${id}`),
  publishAssessment: (id: string) => client.post<{ data: Assessment }>(`/assessments/${id}/publish`, {}),
  archiveAssessment: (id: string) => client.post<{ data: Assessment }>(`/assessments/${id}/archive`, {}),
  addQuestionToAssessment: (id: string, entry: { questionId: string; orderIndex?: number; marks?: number; required?: boolean }) =>
    client.post(`/assessments/${id}/questions`, entry),
  removeQuestionFromAssessment: (id: string, questionId: string) =>
    client.delete(`/assessments/${id}/questions/${questionId}`),
  reorderAssessmentQuestions: (id: string, order: Array<{ questionId: string; orderIndex: number }>) =>
    client.put(`/assessments/${id}/questions/reorder`, { order }),
  mapAssessmentOutcome: (id: string, outcomeId: string) =>
    client.post(`/assessments/${id}/outcomes/${outcomeId}`, {}),
  unmapAssessmentOutcome: (id: string, outcomeId: string) =>
    client.delete(`/assessments/${id}/outcomes/${outcomeId}`),
  assessmentStats: () => client.get<{ data: { total: number; byType: unknown[]; byStatus: unknown[] } }>('/assessments/stats'),

  // Rubrics
  listRubrics: (params?: { courseId?: string; search?: string; page?: number; limit?: number }) =>
    client.get<{ data: Rubric[]; total: number; totalPages: number }>(`/rubrics${buildQuery(params ?? {})}`),
  getRubric: (id: string) => client.get<{ data: Rubric }>(`/rubrics/${id}`),
  createRubric: (dto: Partial<Rubric> & { title: string }) =>
    client.post<{ data: Rubric }>('/rubrics', dto),
  updateRubric: (id: string, dto: Partial<Rubric>) =>
    client.put<{ data: Rubric }>(`/rubrics/${id}`, dto),
  deleteRubric: (id: string) => client.delete(`/rubrics/${id}`),

  // Learning Outcomes
  listOutcomes: (params?: { courseId?: string; bloomLevel?: BloomLevel; page?: number; limit?: number }) =>
    client.get<{ data: LearningOutcome[]; total: number }>(`/outcomes${buildQuery(params ?? {})}`),
  getOutcome: (id: string) => client.get<{ data: LearningOutcome }>(`/outcomes/${id}`),
  createOutcome: (dto: Partial<LearningOutcome> & { description: string }) =>
    client.post<{ data: LearningOutcome }>('/outcomes', dto),
  updateOutcome: (id: string, dto: Partial<LearningOutcome>) =>
    client.put<{ data: LearningOutcome }>(`/outcomes/${id}`, dto),
  deleteOutcome: (id: string) => client.delete(`/outcomes/${id}`),
  getOutcomeMatrix: (courseId: string) =>
    client.get<{ data: { outcomes: LearningOutcome[]; questions: Question[] } }>(`/outcomes/matrix/${courseId}`),

  // Moderation
  submitForModeration: (questionId: string) =>
    client.post<{ data: QuestionModeration }>(`/moderation/questions/${questionId}/submit`, {}),
  getModerationQueue: (status?: ModerationStatus) =>
    client.get<{ data: QuestionModeration[] }>(`/moderation/queue${status ? `?status=${status}` : ''}`),
  approveQuestion: (questionId: string, feedback?: string) =>
    client.post(`/moderation/questions/${questionId}/approve`, { feedback }),
  rejectQuestion: (questionId: string, feedback: string) =>
    client.post(`/moderation/questions/${questionId}/reject`, { feedback }),
  requestRevision: (questionId: string, feedback: string) =>
    client.post(`/moderation/questions/${questionId}/revise`, { feedback }),
  getModerationHistory: (questionId: string) =>
    client.get<{ data: QuestionModeration }>(`/moderation/questions/${questionId}/history`),
  moderationStats: () =>
    client.get<{ data: { pending: number; approved: number; rejected: number; needsRevision: number; total: number } }>('/moderation/stats'),
}
