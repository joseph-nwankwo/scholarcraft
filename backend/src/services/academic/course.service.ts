import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { Prisma, CourseLevel, CourseType, DeliveryMode, AssignmentRole, BloomLevel, DayOfWeek, WeekPattern, MaterialVisibility } from '@prisma/client'

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface CourseFilters {
  search?: string
  departmentId?: string
  programmeId?: string
  semesterId?: string
  level?: CourseLevel
  courseType?: CourseType
  deliveryMode?: DeliveryMode
  active?: boolean
  page?: number
  limit?: number
  sortBy?: 'code' | 'title' | 'level' | 'creditUnits' | 'createdAt'
  sortDir?: 'asc' | 'desc'
}

export interface CreateCourseDto {
  departmentId: string
  programmeId?: string
  semesterId?: string
  code: string
  title: string
  description?: string
  creditUnits?: number
  level: CourseLevel
  courseType?: CourseType
  learningHours?: number
  deliveryMode?: DeliveryMode
}

export interface AssignLecturerDto {
  lecturerId: string
  academicSessionId: string
  semesterId?: string
  role?: AssignmentRole
}

export interface CourseOutcomeDto {
  outcomeCode: string
  description: string
  bloomLevel: BloomLevel
}

export interface TeachingScheduleDto {
  lecturerId: string
  semesterId?: string
  venue?: string
  day: DayOfWeek
  startTime: string
  endTime: string
  weekPattern?: WeekPattern
}

export interface CourseMaterialDto {
  title: string
  fileUrl: string
  fileType: string
  fileSize?: number
  visibility?: MaterialVisibility
}

// ── Course CRUD ──────────────────────────────────────────────────────────────

export const courseService = {
  async list(institutionId: string, filters: CourseFilters = {}) {
    const { search, departmentId, programmeId, semesterId, level, courseType, deliveryMode, active, page = 1, limit = 20, sortBy = 'code', sortDir = 'asc' } = filters
    const skip = (page - 1) * Math.min(limit, 100)

    const where: Prisma.CourseWhereInput = {
      institutionId,
      deletedAt: null,
      ...(departmentId ? { departmentId } : {}),
      ...(programmeId ? { programmeId } : {}),
      ...(semesterId ? { semesterId } : {}),
      ...(level ? { level } : {}),
      ...(courseType ? { courseType } : {}),
      ...(deliveryMode ? { deliveryMode } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(search ? {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } } } },
          programme: { select: { id: true, name: true, degree: true } },
          semester: { select: { id: true, name: true, academicSession: { select: { name: true } } } },
          _count: { select: { assignments: true, outcomes: true, materials: true, schedules: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.course.count({ where }),
    ])

    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async getById(institutionId: string, id: string) {
    const course = await prisma.course.findFirst({
      where: { id, institutionId, deletedAt: null },
      include: {
        department: { include: { faculty: { select: { id: true, name: true } } } },
        programme: true,
        semester: { include: { academicSession: true } },
        outcomes: { orderBy: { outcomeCode: 'asc' } },
        schedules: {
          include: { lecturer: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
        },
        assignments: {
          include: {
            lecturer: { select: { id: true, name: true, avatarUrl: true, email: true } },
            academicSession: { select: { id: true, name: true } },
          },
        },
        materials: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          include: { uploader: { select: { id: true, name: true } } },
        },
        _count: { select: { outcomes: true, schedules: true, assignments: true, materials: true, documents: true } },
      },
    })
    if (!course) throw AppError.notFound('Course')
    return course
  },

  async create(institutionId: string, actorId: string, data: CreateCourseDto) {
    const [dept, existing] = await Promise.all([
      prisma.department.findFirst({ where: { id: data.departmentId, institutionId, deletedAt: null } }),
      prisma.course.findFirst({ where: { institutionId, code: data.code, deletedAt: null } }),
    ])
    if (!dept) throw AppError.notFound('Department')
    if (existing) throw AppError.conflict(`Course code "${data.code}" already exists`)

    const course = await prisma.course.create({
      data: { ...data, institutionId, createdBy: actorId },
      include: {
        department: { select: { id: true, name: true } },
        programme: { select: { id: true, name: true } },
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'course.created', resource: 'course', resourceId: course.id, newValue: data as unknown as object })
    return course
  },

  async update(institutionId: string, id: string, actorId: string, data: Partial<CreateCourseDto> & { active?: boolean }) {
    const course = await prisma.course.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!course) throw AppError.notFound('Course')

    if (data.code && data.code !== course.code) {
      const dup = await prisma.course.findFirst({ where: { institutionId, code: data.code, deletedAt: null, id: { not: id } } })
      if (dup) throw AppError.conflict(`Course code "${data.code}" already in use`)
    }

    const updated = await prisma.course.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true } },
        programme: { select: { id: true, name: true } },
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'course.updated', resource: 'course', resourceId: id, oldValue: course as unknown as object, newValue: data as unknown as object })
    return updated
  },

  async delete(institutionId: string, id: string, actorId: string) {
    const course = await prisma.course.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!course) throw AppError.notFound('Course')
    await prisma.course.update({ where: { id }, data: { deletedAt: new Date() } })
    await auditService.log({ userId: actorId, institutionId, action: 'course.deleted', resource: 'course', resourceId: id })
  },

  async bulkDelete(institutionId: string, ids: string[], actorId: string) {
    await prisma.course.updateMany({
      where: { id: { in: ids }, institutionId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
    await auditService.log({ userId: actorId, institutionId, action: 'course.bulk_deleted', newValue: { ids } as unknown as object })
  },

  // ── Assignments ──────────────────────────────────────────────────────────

  async listAssignments(institutionId: string, courseId: string) {
    await this._validateCourse(institutionId, courseId)
    return prisma.courseAssignment.findMany({
      where: { courseId },
      include: {
        lecturer: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } },
        academicSession: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
        assigner: { select: { id: true, name: true } },
      },
      orderBy: { assignedDate: 'desc' },
    })
  },

  async assignLecturer(institutionId: string, courseId: string, actorId: string, data: AssignLecturerDto) {
    const [course, session] = await Promise.all([
      this._validateCourse(institutionId, courseId),
      prisma.academicSession.findFirst({ where: { id: data.academicSessionId, institutionId } }),
    ])
    if (!session) throw AppError.notFound('Academic session')

    const existing = await prisma.courseAssignment.findFirst({
      where: { lecturerId: data.lecturerId, courseId, academicSessionId: data.academicSessionId },
    })
    if (existing) throw AppError.conflict('Lecturer already assigned to this course for this session')

    const assignment = await prisma.courseAssignment.create({
      data: {
        lecturerId: data.lecturerId,
        courseId,
        academicSessionId: data.academicSessionId,
        semesterId: data.semesterId,
        role: data.role ?? 'LEAD',
        assignedBy: actorId,
      },
      include: {
        lecturer: { select: { id: true, name: true, avatarUrl: true } },
        academicSession: { select: { id: true, name: true } },
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'course.lecturer_assigned', resourceId: courseId, newValue: { lecturerId: data.lecturerId, courseCode: course.code } as unknown as object })
    return assignment
  },

  async removeAssignment(institutionId: string, courseId: string, assignmentId: string, actorId: string) {
    await this._validateCourse(institutionId, courseId)
    const assignment = await prisma.courseAssignment.findFirst({ where: { id: assignmentId, courseId } })
    if (!assignment) throw AppError.notFound('Assignment')
    await prisma.courseAssignment.delete({ where: { id: assignmentId } })
    await auditService.log({ userId: actorId, institutionId, action: 'course.lecturer_removed', resourceId: courseId })
  },

  // ── Outcomes ─────────────────────────────────────────────────────────────

  async listOutcomes(institutionId: string, courseId: string) {
    await this._validateCourse(institutionId, courseId)
    return prisma.courseOutcome.findMany({ where: { courseId }, orderBy: { outcomeCode: 'asc' } })
  },

  async upsertOutcome(institutionId: string, courseId: string, actorId: string, data: CourseOutcomeDto) {
    await this._validateCourse(institutionId, courseId)
    const outcome = await prisma.courseOutcome.upsert({
      where: { courseId_outcomeCode: { courseId, outcomeCode: data.outcomeCode } },
      create: { courseId, ...data },
      update: { description: data.description, bloomLevel: data.bloomLevel },
    })
    await auditService.log({ userId: actorId, institutionId, action: 'course.outcome_upserted', resourceId: courseId })
    return outcome
  },

  async deleteOutcome(institutionId: string, courseId: string, outcomeId: string, actorId: string) {
    await this._validateCourse(institutionId, courseId)
    await prisma.courseOutcome.deleteMany({ where: { id: outcomeId, courseId } })
    await auditService.log({ userId: actorId, institutionId, action: 'course.outcome_deleted', resourceId: courseId })
  },

  // ── Teaching Schedule ─────────────────────────────────────────────────────

  async listSchedules(institutionId: string, courseId: string) {
    await this._validateCourse(institutionId, courseId)
    return prisma.teachingSchedule.findMany({
      where: { courseId },
      include: {
        lecturer: { select: { id: true, name: true, avatarUrl: true } },
        semester: { select: { id: true, name: true } },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    })
  },

  async addSchedule(institutionId: string, courseId: string, actorId: string, data: TeachingScheduleDto) {
    await this._validateCourse(institutionId, courseId)
    const schedule = await prisma.teachingSchedule.create({
      data: { courseId, ...data },
      include: { lecturer: { select: { id: true, name: true } } },
    })
    await auditService.log({ userId: actorId, institutionId, action: 'course.schedule_added', resourceId: courseId })
    return schedule
  },

  async updateSchedule(institutionId: string, courseId: string, scheduleId: string, actorId: string, data: Partial<TeachingScheduleDto>) {
    await this._validateCourse(institutionId, courseId)
    const schedule = await prisma.teachingSchedule.findFirst({ where: { id: scheduleId, courseId } })
    if (!schedule) throw AppError.notFound('Schedule')
    const updated = await prisma.teachingSchedule.update({ where: { id: scheduleId }, data })
    await auditService.log({ userId: actorId, institutionId, action: 'course.schedule_updated', resourceId: courseId })
    return updated
  },

  async deleteSchedule(institutionId: string, courseId: string, scheduleId: string, actorId: string) {
    await this._validateCourse(institutionId, courseId)
    await prisma.teachingSchedule.deleteMany({ where: { id: scheduleId, courseId } })
    await auditService.log({ userId: actorId, institutionId, action: 'course.schedule_deleted', resourceId: courseId })
  },

  // ── Materials ─────────────────────────────────────────────────────────────

  async listMaterials(institutionId: string, courseId: string) {
    await this._validateCourse(institutionId, courseId)
    return prisma.courseMaterial.findMany({
      where: { courseId, deletedAt: null },
      include: { uploader: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async addMaterial(institutionId: string, courseId: string, actorId: string, data: CourseMaterialDto) {
    await this._validateCourse(institutionId, courseId)
    const material = await prisma.courseMaterial.create({
      data: { courseId, uploadedBy: actorId, ...data },
      include: { uploader: { select: { id: true, name: true } } },
    })
    await auditService.log({ userId: actorId, institutionId, action: 'course.material_added', resourceId: courseId })
    return material
  },

  async deleteMaterial(institutionId: string, courseId: string, materialId: string, actorId: string) {
    await this._validateCourse(institutionId, courseId)
    const mat = await prisma.courseMaterial.findFirst({ where: { id: materialId, courseId, deletedAt: null } })
    if (!mat) throw AppError.notFound('Material')
    // Check ownership or admin
    await prisma.courseMaterial.update({ where: { id: materialId }, data: { deletedAt: new Date() } })
    await auditService.log({ userId: actorId, institutionId, action: 'course.material_deleted', resourceId: courseId })
  },

  // ── Lecturer's Assigned Courses ──────────────────────────────────────────

  async getMyCourses(institutionId: string, lecturerId: string) {
    const assignments = await prisma.courseAssignment.findMany({
      where: {
        lecturerId,
        course: { institutionId, deletedAt: null },
        academicSession: { institutionId, current: true },
      },
      include: {
        course: {
          include: {
            department: { select: { id: true, name: true } },
            semester: { select: { id: true, name: true } },
            schedules: {
              where: { lecturerId },
              orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
            },
          },
        },
        academicSession: { select: { id: true, name: true } },
        semester: { select: { id: true, name: true } },
      },
    })
    return assignments
  },

  // ── Stats ────────────────────────────────────────────────────────────────

  async getDashboardStats(institutionId: string) {
    const [totalCourses, activeCourses, currentSemester, totalAssignments] = await Promise.all([
      prisma.course.count({ where: { institutionId, deletedAt: null } }),
      prisma.course.count({ where: { institutionId, deletedAt: null, active: true } }),
      prisma.semester.findFirst({ where: { institutionId, current: true }, include: { academicSession: true } }),
      prisma.courseAssignment.count({ where: { course: { institutionId, deletedAt: null } } }),
    ])

    const byLevel = await prisma.course.groupBy({
      by: ['level'],
      where: { institutionId, deletedAt: null, active: true },
      _count: true,
    })

    const byType = await prisma.course.groupBy({
      by: ['courseType'],
      where: { institutionId, deletedAt: null, active: true },
      _count: true,
    })

    return { totalCourses, activeCourses, currentSemester, totalAssignments, byLevel, byType }
  },

  // ── Internal ─────────────────────────────────────────────────────────────

  async _validateCourse(institutionId: string, courseId: string) {
    const course = await prisma.course.findFirst({ where: { id: courseId, institutionId, deletedAt: null } })
    if (!course) throw AppError.notFound('Course')
    return course
  },
}
