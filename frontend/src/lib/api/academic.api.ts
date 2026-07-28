import { apiClient } from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CourseLevel    = 'L100' | 'L200' | 'L300' | 'L400' | 'L500' | 'L600' | 'L700' | 'POSTGRADUATE'
export type CourseType     = 'COMPULSORY' | 'ELECTIVE' | 'GENERAL'
export type DeliveryMode   = 'FACE_TO_FACE' | 'ONLINE' | 'HYBRID'
export type StudyMode      = 'FULL_TIME' | 'PART_TIME' | 'DISTANCE' | 'BLENDED'
export type AccreditStatus = 'PENDING' | 'ACCREDITED' | 'PROVISIONAL' | 'REVOKED'
export type BloomLevel     = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'EVALUATE' | 'CREATE'
export type DayOfWeek      = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY'
export type WeekPattern    = 'EVERY_WEEK' | 'ODD_WEEKS' | 'EVEN_WEEKS'
export type MaterialVis    = 'PUBLIC' | 'ENROLLED' | 'INSTRUCTORS_ONLY'
export type AssignRole     = 'LEAD' | 'ASSISTANT' | 'SUPERVISOR'

export interface Faculty {
  id: string; institutionId: string; name: string; abbreviation?: string | null
  code: string; description?: string | null; logo?: string | null; deanId?: string | null
  dean?: { id: string; name: string; avatarUrl?: string | null } | null
  _count?: { departments: number }
  createdAt: string; updatedAt: string
}

export interface Department {
  id: string; facultyId: string; institutionId: string; name: string
  abbreviation?: string | null; code: string; description?: string | null; hodId?: string | null
  faculty?: { id: string; name: string; abbreviation?: string | null } | null
  hod?: { id: string; name: string; avatarUrl?: string | null } | null
  _count?: { programmes: number; courses: number }
  createdAt: string; updatedAt: string
}

export interface Programme {
  id: string; departmentId: string; institutionId: string; name: string
  abbreviation?: string | null; degree: string; duration: number
  studyMode: StudyMode; accreditationStatus: AccreditStatus
  department?: { id: string; name: string; faculty?: { id: string; name: string } | null } | null
  _count?: { courses: number }
  createdAt: string; updatedAt: string
}

export interface AcademicSession {
  id: string; institutionId: string; name: string
  startDate: string; endDate: string; current: boolean
  semesters?: Semester[]
  createdAt: string; updatedAt: string
}

export interface Semester {
  id: string; academicSessionId: string; institutionId: string
  name: string; number: number; current: boolean
  startDate: string; endDate: string
  academicSession?: { id: string; name: string } | null
  _count?: { courses: number; courseAssignments: number }
  createdAt: string; updatedAt: string
}

export interface Course {
  id: string; institutionId: string; departmentId: string
  programmeId?: string | null; semesterId?: string | null
  code: string; title: string; description?: string | null
  creditUnits: number; level: CourseLevel; courseType: CourseType
  learningHours?: number | null; deliveryMode: DeliveryMode; active: boolean
  department?: { id: string; name: string; faculty?: { id: string; name: string } | null } | null
  programme?: { id: string; name: string; degree: string } | null
  semester?: { id: string; name: string; academicSession?: { name: string } | null } | null
  _count?: { assignments: number; outcomes: number; materials: number; schedules: number; documents: number }
  createdAt: string; updatedAt: string
}

export interface CourseAssignment {
  id: string; lecturerId: string; courseId: string; academicSessionId: string
  semesterId?: string | null; role: AssignRole; assignedDate: string
  lecturer?: { id: string; name: string; email: string; avatarUrl?: string | null; department?: string | null } | null
  academicSession?: { id: string; name: string } | null
  semester?: { id: string; name: string } | null
}

export interface CourseOutcome {
  id: string; courseId: string; outcomeCode: string; description: string; bloomLevel: BloomLevel
  createdAt: string; updatedAt: string
}

export interface TeachingSchedule {
  id: string; courseId: string; lecturerId: string; semesterId?: string | null
  venue?: string | null; day: DayOfWeek; startTime: string; endTime: string; weekPattern: WeekPattern
  lecturer?: { id: string; name: string; avatarUrl?: string | null } | null
  semester?: { id: string; name: string } | null
}

export interface CourseMaterial {
  id: string; courseId: string; uploadedBy: string; title: string
  fileUrl: string; fileType: string; fileSize?: number | null; visibility: MaterialVis
  uploader?: { id: string; name: string; avatarUrl?: string | null } | null
  createdAt: string; updatedAt: string
}

export interface Paginated<T> { data: T[]; total: number; page: number; totalPages: number }

// ── API helpers ───────────────────────────────────────────────────────────────

const BASE = '/academic'
const get  = <T>(url: string) => apiClient.get<T>(url).then((r) => r.data)
const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)
const put  = <T>(url: string, body?: unknown) => apiClient.put<T>(url, body).then((r) => r.data)
const del  = (url: string) => apiClient.delete(url)

type ListQuery = Record<string, string | number | boolean | undefined>
function qs(q?: ListQuery) {
  if (!q) return ''
  const p = new URLSearchParams()
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── Faculty ───────────────────────────────────────────────────────────────────

export const facultyApi = {
  list:   (q?: ListQuery) => get<{ status: string } & Paginated<Faculty>>(`${BASE}/faculties${qs(q)}`),
  get:    (id: string)    => get<{ status: string; data: Faculty }>(`${BASE}/faculties/${id}`),
  stats:  (id: string)    => get<{ status: string; data: { deptCount: number; programmeCount: number; courseCount: number } }>(`${BASE}/faculties/${id}/stats`),
  create: (body: Partial<Faculty>) => post<{ status: string; data: Faculty }>(`${BASE}/faculties`, body),
  update: (id: string, body: Partial<Faculty>) => put<{ status: string; data: Faculty }>(`${BASE}/faculties/${id}`, body),
  delete: (id: string)    => del(`${BASE}/faculties/${id}`),
}

// ── Department ────────────────────────────────────────────────────────────────

export const departmentApi = {
  list:   (q?: ListQuery) => get<{ status: string } & Paginated<Department>>(`${BASE}/departments${qs(q)}`),
  get:    (id: string)    => get<{ status: string; data: Department }>(`${BASE}/departments/${id}`),
  create: (body: Partial<Department>) => post<{ status: string; data: Department }>(`${BASE}/departments`, body),
  update: (id: string, body: Partial<Department>) => put<{ status: string; data: Department }>(`${BASE}/departments/${id}`, body),
  delete: (id: string)    => del(`${BASE}/departments/${id}`),
}

// ── Programme ─────────────────────────────────────────────────────────────────

export const programmeApi = {
  list:   (q?: ListQuery) => get<{ status: string } & Paginated<Programme>>(`${BASE}/programmes${qs(q)}`),
  get:    (id: string)    => get<{ status: string; data: Programme }>(`${BASE}/programmes/${id}`),
  create: (body: Partial<Programme>) => post<{ status: string; data: Programme }>(`${BASE}/programmes`, body),
  update: (id: string, body: Partial<Programme>) => put<{ status: string; data: Programme }>(`${BASE}/programmes/${id}`, body),
  delete: (id: string)    => del(`${BASE}/programmes/${id}`),
}

// ── Academic Session ──────────────────────────────────────────────────────────

export const sessionApi = {
  list:   ()               => get<{ status: string; data: AcademicSession[] }>(`${BASE}/sessions`),
  get:    (id: string)     => get<{ status: string; data: AcademicSession }>(`${BASE}/sessions/${id}`),
  create: (body: Partial<AcademicSession>) => post<{ status: string; data: AcademicSession }>(`${BASE}/sessions`, body),
  update: (id: string, body: Partial<AcademicSession>) => put<{ status: string; data: AcademicSession }>(`${BASE}/sessions/${id}`, body),
  delete: (id: string)     => del(`${BASE}/sessions/${id}`),

  listSemesters:   (sessionId?: string) => get<{ status: string; data: Semester[] }>(`${BASE}/semesters${qs(sessionId ? { sessionId } : undefined)}`),
  currentSemester: ()      => get<{ status: string; data: Semester | null }>(`${BASE}/semesters/current`),
  getSemester:     (id: string) => get<{ status: string; data: Semester }>(`${BASE}/semesters/${id}`),
  createSemester:  (body: Partial<Semester>) => post<{ status: string; data: Semester }>(`${BASE}/semesters`, body),
  updateSemester:  (id: string, body: Partial<Semester>) => put<{ status: string; data: Semester }>(`${BASE}/semesters/${id}`, body),
  deleteSemester:  (id: string) => del(`${BASE}/semesters/${id}`),
}

// ── Course ────────────────────────────────────────────────────────────────────

export const courseApi = {
  list:       (q?: ListQuery) => get<{ status: string } & Paginated<Course>>(`${BASE}/courses${qs(q)}`),
  get:        (id: string)    => get<{ status: string; data: Course & { assignments: CourseAssignment[]; outcomes: CourseOutcome[]; schedules: TeachingSchedule[]; materials: CourseMaterial[] } }>(`${BASE}/courses/${id}`),
  create:     (body: Partial<Course>) => post<{ status: string; data: Course }>(`${BASE}/courses`, body),
  update:     (id: string, body: Partial<Course> & { active?: boolean }) => put<{ status: string; data: Course }>(`${BASE}/courses/${id}`, body),
  delete:     (id: string)    => del(`${BASE}/courses/${id}`),
  bulkDelete: (ids: string[]) => post<{ status: string }>(`${BASE}/courses/bulk-delete`, { ids }),
  stats:      ()              => get<{ status: string; data: unknown }>(`${BASE}/courses/stats`),
  mine:       ()              => get<{ status: string; data: CourseAssignment[] }>(`${BASE}/courses/mine`),

  // Nested resources
  listAssignments:  (courseId: string) => get<{ status: string; data: CourseAssignment[] }>(`${BASE}/courses/${courseId}/assignments`),
  assignLecturer:   (courseId: string, body: { lecturerId: string; academicSessionId: string; semesterId?: string; role?: AssignRole }) => post<{ status: string; data: CourseAssignment }>(`${BASE}/courses/${courseId}/assignments`, body),
  removeAssignment: (courseId: string, assignmentId: string) => del(`${BASE}/courses/${courseId}/assignments/${assignmentId}`),

  listOutcomes:  (courseId: string) => get<{ status: string; data: CourseOutcome[] }>(`${BASE}/courses/${courseId}/outcomes`),
  upsertOutcome: (courseId: string, body: { outcomeCode: string; description: string; bloomLevel: BloomLevel }) => put<{ status: string; data: CourseOutcome }>(`${BASE}/courses/${courseId}/outcomes`, body),
  deleteOutcome: (courseId: string, outcomeId: string) => del(`${BASE}/courses/${courseId}/outcomes/${outcomeId}`),

  listSchedules:  (courseId: string) => get<{ status: string; data: TeachingSchedule[] }>(`${BASE}/courses/${courseId}/schedules`),
  addSchedule:    (courseId: string, body: Partial<TeachingSchedule>) => post<{ status: string; data: TeachingSchedule }>(`${BASE}/courses/${courseId}/schedules`, body),
  updateSchedule: (courseId: string, scheduleId: string, body: Partial<TeachingSchedule>) => put<{ status: string; data: TeachingSchedule }>(`${BASE}/courses/${courseId}/schedules/${scheduleId}`, body),
  deleteSchedule: (courseId: string, scheduleId: string) => del(`${BASE}/courses/${courseId}/schedules/${scheduleId}`),

  listMaterials:  (courseId: string) => get<{ status: string; data: CourseMaterial[] }>(`${BASE}/courses/${courseId}/materials`),
  addMaterial:    (courseId: string, body: Partial<CourseMaterial>) => post<{ status: string; data: CourseMaterial }>(`${BASE}/courses/${courseId}/materials`, body),
  deleteMaterial: (courseId: string, materialId: string) => del(`${BASE}/courses/${courseId}/materials/${materialId}`),
}
