import { apiClient } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CourseBasic {
  id: string; title: string; code: string; creditUnits: number
  level: string; courseType?: string; deliveryMode?: string
  description?: string | null
  department?: { name: string } | null
  programme?:  { name: string } | null
  assignments?: { lecturer: { name: string } }[]
  enrolled?: boolean
}

export interface EnrolledCourse extends CourseBasic {
  assessments?: { id: string; title: string; dueDate: string | null }[]
  enrolledAt: string
  status: 'ACTIVE' | 'DROPPED' | 'COMPLETED'
  academicSession?: { name: string } | null
}

export interface AssignmentBrief {
  id: string; title: string; dueDate: string | null; totalMarks: number
  course?: { title: string; code: string } | null
}

export interface Submission {
  id: string
  studentId: string
  assessmentId: string
  courseId: string | null
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileSize: number | null
  fileType: string | null
  status: 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED'
  submittedAt: string | null
  grade: number | null
  feedback: string | null
  gradedAt: string | null
  assessment?: {
    id: string; title: string; description?: string | null; instructions?: string | null
    dueDate: string | null; openDate?: string | null; totalMarks: number; allowLate?: boolean
    course?: { id: string; title: string; code: string } | null
  }
  createdAt: string
  updatedAt: string
}

export interface DashboardData {
  enrolledCourses: number
  pendingAssignments: AssignmentBrief[]
  recentSubmissions: Submission[]
  stats: { totalSubmissions: number; totalGraded: number; avgGrade: number | null }
}

// ── Enrollment API ─────────────────────────────────────────────────────────────

export const enrollmentApi = {
  getAvailable: () =>
    apiClient.get<{ data: (CourseBasic & { enrolled: boolean })[] }>('/enrollments/available').then((r) => r.data.data),

  getMy: () =>
    apiClient.get<{ data: EnrolledCourse[] }>('/enrollments/my').then((r) => r.data.data),

  enroll: (courseId: string, academicSessionId?: string) =>
    apiClient.post<{ data: EnrolledCourse }>('/enrollments', { courseId, academicSessionId }).then((r) => r.data.data),

  drop: (courseId: string) =>
    apiClient.delete(`/enrollments/${courseId}`),

  getCourseStudents: (courseId: string) =>
    apiClient.get<{ data: unknown[] }>(`/enrollments/course/${courseId}/students`).then((r) => r.data.data),
}

// ── Submission API ─────────────────────────────────────────────────────────────

export const submissionApi = {
  getMy: () =>
    apiClient.get<{ data: Submission[] }>('/submissions/my').then((r) => r.data.data),

  get: (assessmentId: string) =>
    apiClient.get<{ data: Submission | null }>(`/submissions/${assessmentId}`).then((r) => r.data.data),

  saveDraft: (assessmentId: string, content?: string, file?: File) => {
    const fd = new FormData()
    if (content !== undefined) fd.append('content', content)
    if (file) fd.append('file', file)
    return apiClient.post<{ data: Submission }>(`/submissions/${assessmentId}/draft`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },

  submit: (assessmentId: string) =>
    apiClient.post<{ data: Submission }>(`/submissions/${assessmentId}/submit`).then((r) => r.data.data),

  // Lecturer
  getForAssignment: (assessmentId: string) =>
    apiClient.get<{ data: Submission[] }>(`/submissions/assignment/${assessmentId}/all`).then((r) => r.data.data),

  grade: (submissionId: string, grade: number, feedback?: string) =>
    apiClient.patch<{ data: Submission }>(`/submissions/${submissionId}/grade`, { grade, feedback }).then((r) => r.data.data),

  returnSubmission: (submissionId: string, feedback: string) =>
    apiClient.patch<{ data: Submission }>(`/submissions/${submissionId}/return`, { feedback }).then((r) => r.data.data),
}

// ── Student dashboard ─────────────────────────────────────────────────────────

export const studentApi = {
  getDashboard: () =>
    apiClient.get<{ data: DashboardData }>('/student/dashboard').then((r) => r.data.data),
}
