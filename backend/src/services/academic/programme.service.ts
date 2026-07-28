import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { Prisma, StudyMode, AccreditationStatus } from '@prisma/client'

export interface ProgrammeFilters {
  search?: string
  departmentId?: string
  facultyId?: string
  studyMode?: StudyMode
  accreditationStatus?: AccreditationStatus
  page?: number
  limit?: number
  sortBy?: 'name' | 'degree' | 'createdAt'
  sortDir?: 'asc' | 'desc'
}

export interface CreateProgrammeDto {
  departmentId: string
  name: string
  abbreviation?: string
  degree: string
  duration?: number
  studyMode?: StudyMode
  accreditationStatus?: AccreditationStatus
}

export const programmeService = {
  async list(institutionId: string, filters: ProgrammeFilters = {}) {
    const { search, departmentId, facultyId, studyMode, accreditationStatus, page = 1, limit = 20, sortBy = 'name', sortDir = 'asc' } = filters
    const skip = (page - 1) * Math.min(limit, 100)

    const where: Prisma.ProgrammeWhereInput = {
      institutionId,
      deletedAt: null,
      ...(departmentId ? { departmentId } : {}),
      ...(facultyId ? { department: { facultyId } } : {}),
      ...(studyMode ? { studyMode } : {}),
      ...(accreditationStatus ? { accreditationStatus } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { abbreviation: { contains: search, mode: 'insensitive' } },
          { degree: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.programme.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } } } },
          _count: { select: { courses: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.programme.count({ where }),
    ])

    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async getById(institutionId: string, id: string) {
    const prog = await prisma.programme.findFirst({
      where: { id, institutionId, deletedAt: null },
      include: {
        department: { include: { faculty: { select: { id: true, name: true } } } },
        courses: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
        _count: { select: { courses: true } },
      },
    })
    if (!prog) throw AppError.notFound('Programme')
    return prog
  },

  async create(institutionId: string, actorId: string, data: CreateProgrammeDto) {
    const dept = await prisma.department.findFirst({ where: { id: data.departmentId, institutionId, deletedAt: null } })
    if (!dept) throw AppError.notFound('Department')

    const programme = await prisma.programme.create({
      data: { ...data, institutionId },
      include: { department: { select: { id: true, name: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'programme.created', resource: 'programme', resourceId: programme.id, newValue: data as unknown as object })
    return programme
  },

  async update(institutionId: string, id: string, actorId: string, data: Partial<CreateProgrammeDto>) {
    const prog = await prisma.programme.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!prog) throw AppError.notFound('Programme')

    const updated = await prisma.programme.update({
      where: { id },
      data,
      include: { department: { select: { id: true, name: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'programme.updated', resource: 'programme', resourceId: id, oldValue: prog as unknown as object, newValue: data as unknown as object })
    return updated
  },

  async delete(institutionId: string, id: string, actorId: string) {
    const prog = await prisma.programme.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!prog) throw AppError.notFound('Programme')
    await prisma.programme.update({ where: { id }, data: { deletedAt: new Date() } })
    await auditService.log({ userId: actorId, institutionId, action: 'programme.deleted', resource: 'programme', resourceId: id })
  },
}
