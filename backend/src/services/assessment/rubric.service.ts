import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'

interface RubricLevel {
  label: string
  description: string
  points: number
}

interface CriterionDTO {
  title: string
  description?: string
  maxPoints: number
  orderIndex?: number
  levels?: RubricLevel[]
}

interface CreateRubricDTO {
  title: string
  description?: string
  totalPoints?: number
  isPublic?: boolean
  courseId?: string
  criteria?: CriterionDTO[]
}

const R_SELECT = {
  id: true, title: true, description: true, totalPoints: true, isPublic: true,
  courseId: true, institutionId: true, createdAt: true, updatedAt: true,
  creator: { select: { id: true, name: true } },
  course: { select: { id: true, code: true, title: true } },
  criteria: { orderBy: { orderIndex: 'asc' as const } },
  _count: { select: { assessments: true } },
}

export const rubricService = {
  async list(userId: string, institutionId: string | null, opts: { courseId?: string; search?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20, search, courseId } = opts
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {
      OR: [{ createdBy: userId }, { isPublic: true, institutionId }],
    }
    if (courseId) where.courseId = courseId
    if (search) where.title = { contains: search, mode: 'insensitive' }

    const [data, total] = await Promise.all([
      prisma.rubric.findMany({ where, select: R_SELECT, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      prisma.rubric.count({ where }),
    ])
    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async get(id: string, userId: string, institutionId: string | null) {
    const r = await prisma.rubric.findFirst({
      where: { id, OR: [{ createdBy: userId }, { isPublic: true, institutionId }] },
      select: R_SELECT,
    })
    if (!r) throw AppError.notFound('Rubric')
    return r
  },

  async create(userId: string, institutionId: string | null, dto: CreateRubricDTO) {
    const { criteria, ...rest } = dto
    const r = await prisma.rubric.create({
      data: {
        ...rest,
        createdBy: userId,
        institutionId,
        criteria: criteria ? {
          create: criteria.map((c, i) => ({
            ...c,
            orderIndex: c.orderIndex ?? i,
            levels: (c.levels ?? []) as object,
          })),
        } : undefined,
      },
      select: R_SELECT,
    })
    void auditService.log({ userId, action: 'rubric.created', resource: 'rubric', resourceId: r.id })
    return r
  },

  async update(id: string, userId: string, dto: Partial<CreateRubricDTO>) {
    const existing = await prisma.rubric.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Rubric')

    const { criteria, ...rest } = dto
    const r = await prisma.rubric.update({
      where: { id },
      data: {
        ...rest,
        ...(criteria !== undefined ? {
          criteria: {
            deleteMany: {},
            create: criteria.map((c, i) => ({
              ...c,
              orderIndex: c.orderIndex ?? i,
              levels: (c.levels ?? []) as object,
            })),
          },
        } : {}),
      },
      select: R_SELECT,
    })
    void auditService.log({ userId, action: 'rubric.updated', resource: 'rubric', resourceId: id })
    return r
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.rubric.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Rubric')
    await prisma.rubric.delete({ where: { id } })
    void auditService.log({ userId, action: 'rubric.deleted', resource: 'rubric', resourceId: id })
  },
}
