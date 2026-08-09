import axios from 'axios'

const LC_BASE_URL = import.meta.env.VITE_LC_API_URL ?? 'http://localhost:4000/api'

const lcClient = axios.create({
  baseURL: LC_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

lcClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface LCCoursePreview {
  id:          string
  title:       string
  code:        string | null
  description: string | null
  level:       string
  department:  string | null
  faculty:     string | null
  enrollCode:  string
  user:        { name: string; avatarUrl: string | null }
  _count:      { enrollments: number }
}

export interface LCJoinedCourse extends LCCoursePreview {
  semester:         string | null
  academicYear:     string | null
  enrolledAt:       string
  enrollmentStatus: string
  isLecturerCourse: true
}

export interface LCAnnouncement {
  id:        string
  title:     string
  content:   string
  isPinned:  boolean
  createdAt: string
  author:    { id: string; name: string; avatarUrl: string | null }
}

export interface LCMaterial {
  id:        string
  title:     string
  type:      string
  status:    string
  fileUrl:   string | null
  fileType:  string | null
  createdAt: string
}

export interface LCSession {
  id:           string
  title:        string
  description:  string | null
  scheduledAt:  string
  durationMins: number
  location:     string | null
  isOnline:     boolean
  meetLink:     string | null
  createdAt:    string
}

export interface LCPoll {
  id:        string
  question:  string
  options:   string[]
  isActive:  boolean
  expiresAt: string | null
  createdAt: string
  responses: { selectedOption: number }[]
  _count:    { responses: number }
}

export interface LCAssignment {
  id:            string
  courseId:      string
  title:         string
  description:   string | null
  dueDate:       string | null
  totalMarks:    number | null
  attachmentUrl: string | null
  createdAt:     string
  _count:        { submissions: number }
  submissions:   { grade: number | null; feedback: string | null; submittedAt: string; submissionUrl: string | null; textContent: string | null }[]
}

export interface LCStudentAttendanceEntry {
  id:     string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
  record: { date: string }
}

export interface LCDiscussionThread {
  id:         string
  courseId:   string
  authorId:   string
  title:      string
  body:       string
  isPinned:   boolean
  isResolved: boolean
  createdAt:  string
  updatedAt:  string
  author:     { id: string; name: string; avatarUrl: string | null }
  _count:     { replies: number }
}

export interface LCDiscussionReply {
  id:        string
  threadId:  string
  authorId:  string
  body:      string
  createdAt: string
  updatedAt: string
  author:    { id: string; name: string; avatarUrl: string | null }
}

export const classConnectApi = {
  preview: (code: string) =>
    lcClient
      .get<{ status: string; course: LCCoursePreview }>(`/courses/join/${code.toUpperCase()}`)
      .then((r) => r.data.course),

  join: (code: string) =>
    lcClient
      .post<{ status: string; enrollment: { id: string; status: string } }>(`/courses/join/${code.toUpperCase()}`)
      .then((r) => r.data.enrollment),

  myClasses: () =>
    lcClient
      .get<{ status: string; data: LCJoinedCourse[] }>('/courses/my-joined')
      .then((r) => r.data.data),

  getAnnouncements: (courseId: string) =>
    lcClient
      .get<{ data: LCAnnouncement[] }>(`/courses/${courseId}/announcements`)
      .then((r) => r.data.data),

  getMaterials: (courseId: string) =>
    lcClient
      .get<{ data: LCMaterial[] }>(`/courses/${courseId}/materials`)
      .then((r) => r.data.data),

  getSessions: (courseId: string) =>
    lcClient
      .get<{ data: LCSession[] }>(`/courses/${courseId}/sessions`)
      .then((r) => r.data.data),

  getPolls: (courseId: string) =>
    lcClient
      .get<{ data: LCPoll[] }>(`/courses/${courseId}/polls`)
      .then((r) => r.data.data),

  respondToPoll: (courseId: string, pollId: string, selectedOption: number) =>
    lcClient
      .post(`/courses/${courseId}/polls/${pollId}/respond`, { selectedOption }),

  getAssignments: (courseId: string) =>
    lcClient
      .get<{ data: LCAssignment[] }>(`/courses/${courseId}/assignments`)
      .then((r) => r.data.data),

  submitAssignment: (courseId: string, assignmentId: string, payload: { submissionUrl?: string; textContent?: string }) =>
    lcClient
      .post(`/courses/${courseId}/assignments/${assignmentId}/submit`, payload),

  getAttendance: (courseId: string) =>
    lcClient
      .get<{ data: LCStudentAttendanceEntry[] }>(`/courses/${courseId}/attendance`)
      .then((r) => r.data.data),

  getDiscussions: (courseId: string) =>
    lcClient
      .get<{ data: LCDiscussionThread[] }>(`/courses/${courseId}/discussions`)
      .then((r) => r.data.data),

  createDiscussion: (courseId: string, payload: { title: string; body: string }) =>
    lcClient
      .post<{ data: LCDiscussionThread }>(`/courses/${courseId}/discussions`, payload)
      .then((r) => r.data.data),

  deleteDiscussion: (courseId: string, threadId: string) =>
    lcClient.delete(`/courses/${courseId}/discussions/${threadId}`),

  getThreadReplies: (courseId: string, threadId: string) =>
    lcClient
      .get<{ data: LCDiscussionReply[] }>(`/courses/${courseId}/discussions/${threadId}/replies`)
      .then((r) => r.data.data),

  addReply: (courseId: string, threadId: string, body: string) =>
    lcClient
      .post<{ data: LCDiscussionReply }>(`/courses/${courseId}/discussions/${threadId}/replies`, { body })
      .then((r) => r.data.data),

  deleteReply: (courseId: string, threadId: string, replyId: string) =>
    lcClient.delete(`/courses/${courseId}/discussions/${threadId}/replies/${replyId}`),
}
