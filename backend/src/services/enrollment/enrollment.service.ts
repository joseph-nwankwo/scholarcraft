import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

export const enrollmentService = {
  async enroll(studentId: string, courseId: string, academicSessionId?: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course || !course.active) throw AppError.notFound('Course not found or inactive')

    const existing = await prisma.courseEnrollment.findFirst({
      where: { studentId, courseId, academicSessionId: academicSessionId ?? null },
    })
    if (existing) {
      if (existing.status === 'DROPPED') {
        return prisma.courseEnrollment.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', enrolledAt: new Date() },
          include: { course: { select: { id: true, title: true, code: true } } },
        })
      }
      throw AppError.conflict('Already enrolled in this course')
    }

    return prisma.courseEnrollment.create({
      data: { studentId, courseId, academicSessionId: academicSessionId ?? null },
      include: { course: { select: { id: true, title: true, code: true } } },
    })
  },

  async drop(studentId: string, courseId: string) {
    const enrollment = await prisma.courseEnrollment.findFirst({
      where: { studentId, courseId, status: 'ACTIVE' },
    })
    if (!enrollment) throw AppError.notFound('Active enrollment not found')

    return prisma.courseEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'DROPPED' },
    })
  },

  async getMyEnrollments(studentId: string) {
    const rows = await prisma.courseEnrollment.findMany({
      where: { studentId, status: { not: 'DROPPED' } },
      include: {
        course: {
          select: {
            id: true, title: true, code: true, creditUnits: true, level: true,
            deliveryMode: true, description: true,
            department: { select: { name: true } },
            assignments: {
              where: { role: 'LEAD' },
              select: { lecturer: { select: { name: true } } },
              take: 1,
            },
            assessments: {
              where: { type: 'ASSIGNMENT', status: 'PUBLISHED' },
              select: { id: true, title: true, dueDate: true },
            },
          },
        },
        academicSession: { select: { name: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    })
    // Flatten so the course fields are at the top level (id = course id)
    return rows.map(({ course, academicSession, enrolledAt, status }) => ({
      ...course,
      enrolledAt: enrolledAt.toISOString(),
      status,
      academicSession,
    }))
  },

  async getCourseStudents(courseId: string) {
    return prisma.courseEnrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
        academicSession: { select: { name: true } },
      },
      orderBy: { enrolledAt: 'asc' },
    })
  },

  async getAvailableCourses(institutionId: string | null, studentId: string) {
    const [courses, enrollments] = await Promise.all([
      prisma.course.findMany({
        where: { ...(institutionId ? { institutionId } : {}), active: true, deletedAt: null },
        select: {
          id: true, title: true, code: true, creditUnits: true,
          level: true, courseType: true, deliveryMode: true, description: true,
          department: { select: { name: true } },
          programme:  { select: { name: true } },
          assignments: {
            where: { role: 'LEAD' },
            select: { lecturer: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: [{ level: 'asc' }, { title: 'asc' }],
      }),
      prisma.courseEnrollment.findMany({
        where: { studentId, status: { not: 'DROPPED' } },
        select: { courseId: true },
      }),
    ])

    const enrolledIds = new Set(enrollments.map((e) => e.courseId))
    return courses.map((c) => ({ ...c, enrolled: enrolledIds.has(c.id) }))
  },
}
