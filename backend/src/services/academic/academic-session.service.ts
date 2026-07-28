import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'

export interface CreateSessionDto {
  name: string
  startDate: Date | string
  endDate: Date | string
  current?: boolean
}

export interface CreateSemesterDto {
  academicSessionId: string
  name: string
  number: number
  startDate: Date | string
  endDate: Date | string
  current?: boolean
}

export const academicSessionService = {
  // ── Sessions ────────────────────────────────────────────────────

  async listSessions(institutionId: string) {
    return prisma.academicSession.findMany({
      where: { institutionId },
      include: {
        semesters: { orderBy: { number: 'asc' } },
        _count: { select: { courseAssignments: true } },
      },
      orderBy: { startDate: 'desc' },
    })
  },

  async getSession(institutionId: string, id: string) {
    const session = await prisma.academicSession.findFirst({
      where: { id, institutionId },
      include: { semesters: { orderBy: { number: 'asc' } } },
    })
    if (!session) throw AppError.notFound('Academic session')
    return session
  },

  async createSession(institutionId: string, actorId: string, data: CreateSessionDto) {
    const existing = await prisma.academicSession.findFirst({ where: { institutionId, name: data.name } })
    if (existing) throw AppError.conflict(`Session "${data.name}" already exists`)

    if (data.current) {
      await prisma.academicSession.updateMany({ where: { institutionId }, data: { current: false } })
    }

    const session = await prisma.academicSession.create({
      data: {
        institutionId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        current: data.current ?? false,
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'academic_session.created', resource: 'academic_session', resourceId: session.id, newValue: data as unknown as object })
    return session
  },

  async updateSession(institutionId: string, id: string, actorId: string, data: Partial<CreateSessionDto>) {
    const session = await prisma.academicSession.findFirst({ where: { id, institutionId } })
    if (!session) throw AppError.notFound('Academic session')

    if (data.current) {
      await prisma.academicSession.updateMany({ where: { institutionId, id: { not: id } }, data: { current: false } })
    }

    const updated = await prisma.academicSession.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.current !== undefined ? { current: data.current } : {}),
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'academic_session.updated', resource: 'academic_session', resourceId: id })
    return updated
  },

  async deleteSession(institutionId: string, id: string, actorId: string) {
    const session = await prisma.academicSession.findFirst({ where: { id, institutionId } })
    if (!session) throw AppError.notFound('Academic session')
    if (session.current) throw AppError.badRequest('Cannot delete the current academic session')
    await prisma.academicSession.delete({ where: { id } })
    await auditService.log({ userId: actorId, institutionId, action: 'academic_session.deleted', resourceId: id })
  },

  // ── Semesters ───────────────────────────────────────────────────

  async listSemesters(institutionId: string, sessionId?: string) {
    return prisma.semester.findMany({
      where: {
        institutionId,
        ...(sessionId ? { academicSessionId: sessionId } : {}),
      },
      include: {
        academicSession: { select: { id: true, name: true } },
        _count: { select: { courses: true, courseAssignments: true } },
      },
      orderBy: [{ academicSession: { startDate: 'desc' } }, { number: 'asc' }],
    })
  },

  async getSemester(institutionId: string, id: string) {
    const sem = await prisma.semester.findFirst({
      where: { id, institutionId },
      include: {
        academicSession: true,
        courses: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
      },
    })
    if (!sem) throw AppError.notFound('Semester')
    return sem
  },

  async getCurrentSemester(institutionId: string) {
    return prisma.semester.findFirst({
      where: { institutionId, current: true },
      include: { academicSession: true },
    })
  },

  async createSemester(institutionId: string, actorId: string, data: CreateSemesterDto) {
    const session = await prisma.academicSession.findFirst({ where: { id: data.academicSessionId, institutionId } })
    if (!session) throw AppError.notFound('Academic session')

    const existing = await prisma.semester.findFirst({ where: { academicSessionId: data.academicSessionId, number: data.number } })
    if (existing) throw AppError.conflict(`Semester ${data.number} already exists for this session`)

    if (data.current) {
      await prisma.semester.updateMany({ where: { institutionId }, data: { current: false } })
    }

    const semester = await prisma.semester.create({
      data: {
        institutionId,
        academicSessionId: data.academicSessionId,
        name: data.name,
        number: data.number,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        current: data.current ?? false,
      },
      include: { academicSession: { select: { id: true, name: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'semester.created', resource: 'semester', resourceId: semester.id, newValue: data as unknown as object })
    return semester
  },

  async updateSemester(institutionId: string, id: string, actorId: string, data: Partial<Omit<CreateSemesterDto, 'academicSessionId'>>) {
    const sem = await prisma.semester.findFirst({ where: { id, institutionId } })
    if (!sem) throw AppError.notFound('Semester')

    if (data.current) {
      await prisma.semester.updateMany({ where: { institutionId, id: { not: id } }, data: { current: false } })
    }

    const updated = await prisma.semester.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.number ? { number: data.number } : {}),
        ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
        ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
        ...(data.current !== undefined ? { current: data.current } : {}),
      },
      include: { academicSession: { select: { id: true, name: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'semester.updated', resourceId: id })
    return updated
  },

  async deleteSemester(institutionId: string, id: string, actorId: string) {
    const sem = await prisma.semester.findFirst({ where: { id, institutionId } })
    if (!sem) throw AppError.notFound('Semester')
    if (sem.current) throw AppError.badRequest('Cannot delete the current semester')
    await prisma.semester.delete({ where: { id } })
    await auditService.log({ userId: actorId, institutionId, action: 'semester.deleted', resourceId: id })
  },
}
