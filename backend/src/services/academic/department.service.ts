import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { Prisma } from '@prisma/client'

export interface DepartmentFilters {
  search?: string
  facultyId?: string
  page?: number
  limit?: number
  sortBy?: 'name' | 'code' | 'createdAt'
  sortDir?: 'asc' | 'desc'
}

export interface CreateDepartmentDto {
  facultyId: string
  name: string
  abbreviation?: string
  code: string
  description?: string
  hodId?: string
}

export const departmentService = {
  async list(institutionId: string, filters: DepartmentFilters = {}) {
    const { search, facultyId, page = 1, limit = 20, sortBy = 'name', sortDir = 'asc' } = filters
    const skip = (page - 1) * Math.min(limit, 100)

    const where: Prisma.DepartmentWhereInput = {
      institutionId,
      deletedAt: null,
      ...(facultyId ? { facultyId } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    }

    const [data, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          faculty: { select: { id: true, name: true, abbreviation: true } },
          hod: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { programmes: true, courses: true } },
        },
        orderBy: { [sortBy]: sortDir },
        skip,
        take: Math.min(limit, 100),
      }),
      prisma.department.count({ where }),
    ])

    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async getById(institutionId: string, id: string) {
    const dept = await prisma.department.findFirst({
      where: { id, institutionId, deletedAt: null },
      include: {
        faculty: { select: { id: true, name: true, abbreviation: true } },
        hod: { select: { id: true, name: true, email: true, avatarUrl: true } },
        programmes: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        _count: { select: { courses: true, programmes: true } },
      },
    })
    if (!dept) throw AppError.notFound('Department')
    return dept
  },

  async create(institutionId: string, actorId: string, data: CreateDepartmentDto) {
    // Verify faculty belongs to this institution
    const faculty = await prisma.faculty.findFirst({ where: { id: data.facultyId, institutionId, deletedAt: null } })
    if (!faculty) throw AppError.notFound('Faculty')

    const existing = await prisma.department.findFirst({ where: { institutionId, code: data.code, deletedAt: null } })
    if (existing) throw AppError.conflict(`Department code "${data.code}" already exists`)

    const dept = await prisma.department.create({
      data: { ...data, institutionId },
      include: {
        faculty: { select: { id: true, name: true } },
        hod: { select: { id: true, name: true } },
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'department.created', resource: 'department', resourceId: dept.id, newValue: data as unknown as object })
    return dept
  },

  async update(institutionId: string, id: string, actorId: string, data: Partial<CreateDepartmentDto>) {
    const dept = await prisma.department.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!dept) throw AppError.notFound('Department')

    if (data.code && data.code !== dept.code) {
      const dup = await prisma.department.findFirst({ where: { institutionId, code: data.code, deletedAt: null, id: { not: id } } })
      if (dup) throw AppError.conflict(`Department code "${data.code}" already in use`)
    }

    const updated = await prisma.department.update({
      where: { id },
      data: { ...data, facultyId: data.facultyId ?? dept.facultyId },
      include: {
        faculty: { select: { id: true, name: true } },
        hod: { select: { id: true, name: true } },
      },
    })

    await auditService.log({ userId: actorId, institutionId, action: 'department.updated', resource: 'department', resourceId: id, oldValue: dept as unknown as object, newValue: data as unknown as object })
    return updated
  },

  async delete(institutionId: string, id: string, actorId: string) {
    const dept = await prisma.department.findFirst({ where: { id, institutionId, deletedAt: null } })
    if (!dept) throw AppError.notFound('Department')

    await prisma.department.update({ where: { id }, data: { deletedAt: new Date() } })
    await auditService.log({ userId: actorId, institutionId, action: 'department.deleted', resource: 'department', resourceId: id })
  },
}
