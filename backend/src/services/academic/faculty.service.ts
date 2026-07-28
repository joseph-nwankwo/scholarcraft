import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { Prisma } from '@prisma/client'

export interface FacultyFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'code' | 'createdAt'
  sortDir?: 'asc' | 'desc'
}

export interface CreateFacultyDto {
  name: string
  abbreviation?: string
  code: string
  description?: string
  logo?: string
  deanId?: string
}

export const facultyService = {
  async list(institutionId: string, filters: FacultyFilters = {}) {
    const { search, page = 1, limit = 20, sortBy = 'name', sortDir = 'asc' } = filters
    const skip = (page - 1) * Math.min(limit, 100)

    const where: Prisma.FacultyWhereInput = {
      institutionId,
      deletedAt: null,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { abbreviation: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.faculty.findMany({
        where,
        include: {
          dean: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { departments: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.faculty.count({ where }),
    ])

    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async getById(institutionId: string, id: string) {
    const faculty = await prisma.faculty.findFirst({
      where: { id, institutionId, deletedAt: null },
      include: {
        dean: { select: { id: true, name: true, avatarUrl: true, email: true } },
        departments: {
          where: { deletedAt: null },
          include: { _count: { select: { courses: true, programmes: true } } },
          orderBy: { name: 'asc' },
        },
        _count: { select: { departments: true } },
      },
    })
    if (!faculty) throw AppError.notFound('Faculty')
    return faculty
  },

  async create(institutionId: string, actorId: string, data: CreateFacultyDto) {
    const existing = await prisma.faculty.findFirst({ where: { institutionId, code: data.code, deletedAt: null } })
    if (existing) throw AppError.conflict(`Faculty with code "${data.code}" already exists`)

    const faculty = await prisma.faculty.create({
      data: { ...data, institutionId },
      include: { dean: { select: { id: true, name: true, avatarUrl: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'faculty.created', resource: 'faculty', resourceId: faculty.id, newValue: data as unknown as object })
    return faculty
  },

  async update(institutionId: string, id: string, actorId: string, data: Partial<CreateFacultyDto>) {
    const faculty = await prisma.faculty.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!faculty) throw AppError.notFound('Faculty')

    if (data.code && data.code !== faculty.code) {
      const dup = await prisma.faculty.findFirst({ where: { institutionId, code: data.code, deletedAt: null, id: { not: id } } })
      if (dup) throw AppError.conflict(`Faculty code "${data.code}" already in use`)
    }

    const updated = await prisma.faculty.update({
      where: { id },
      data,
      include: { dean: { select: { id: true, name: true, avatarUrl: true } } },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'faculty.updated', resource: 'faculty', resourceId: id, oldValue: faculty as unknown as object, newValue: data as unknown as object })
    return updated
  },

  async delete(institutionId: string, id: string, actorId: string) {
    const faculty = await prisma.faculty.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!faculty) throw AppError.notFound('Faculty')

    await prisma.faculty.update({ where: { id }, data: { deletedAt: new Date() } })
    await auditService.log({ userId: actorId, institutionId, action: 'faculty.deleted', resource: 'faculty', resourceId: id })
  },

  async getStats(institutionId: string, id: string) {
    const faculty = await prisma.faculty.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!faculty) throw AppError.notFound('Faculty')

    const [deptCount, programmeCount, courseCount] = await Promise.all([
      prisma.department.count({ where: { facultyId: id, deletedAt: null } }),
      prisma.programme.count({ where: { department: { facultyId: id }, deletedAt: null } }),
      prisma.course.count({ where: { department: { facultyId: id }, deletedAt: null } }),
    ])

    return { deptCount, programmeCount, courseCount }
  },
}
