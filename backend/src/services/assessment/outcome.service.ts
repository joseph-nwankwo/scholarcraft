import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { BloomLevel } from '@prisma/client'

interface CreateOutcomeDTO {
  description: string
  bloomLevel?: BloomLevel
  code?: string
  category?: string
  courseId?: string
}

const O_SELECT = {
  id: true, code: true, description: true, bloomLevel: true, category: true,
  courseId: true, institutionId: true, createdAt: true, updatedAt: true,
  creator: { select: { id: true, name: true } },
  course: { select: { id: true, code: true, title: true } },
  _count: { select: { questionMaps: true, assessmentMaps: true } },
}

export const outcomeService = {
  async list(userId: string, institutionId: string | null, opts: { courseId?: string; bloomLevel?: BloomLevel; page?: number; limit?: number }) {
    const { page = 1, limit = 50, courseId, bloomLevel } = opts
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = { OR: [{ createdBy: userId }, { institutionId }] }
    if (courseId) where.courseId = courseId
    if (bloomLevel) where.bloomLevel = bloomLevel

    const [data, total] = await Promise.all([
      prisma.learningOutcome.findMany({ where, select: O_SELECT, orderBy: { createdAt: 'asc' }, skip, take: limit }),
      prisma.learningOutcome.count({ where }),
    ])
    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async get(id: string, userId: string, institutionId: string | null) {
    const o = await prisma.learningOutcome.findFirst({
      where: { id, OR: [{ createdBy: userId }, { institutionId }] },
      include: {
        ...O_SELECT,
        questionMaps: {
          include: {
            question: {
              select: { id: true, text: true, type: true, bloomLevel: true, difficulty: true },
            },
          },
        },
        assessmentMaps: {
          include: {
            assessment: { select: { id: true, title: true, type: true, status: true } },
          },
        },
      },
    })
    if (!o) throw AppError.notFound('Learning Outcome')
    return o
  },

  async create(userId: string, institutionId: string | null, dto: CreateOutcomeDTO) {
    const o = await prisma.learningOutcome.create({
      data: { ...dto, createdBy: userId, institutionId },
      select: O_SELECT,
    })
    void auditService.log({ userId, action: 'outcome.created', resource: 'learning_outcome', resourceId: o.id })
    return o
  },

  async update(id: string, userId: string, dto: Partial<CreateOutcomeDTO>) {
    const existing = await prisma.learningOutcome.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Learning Outcome')
    const o = await prisma.learningOutcome.update({ where: { id }, data: dto, select: O_SELECT })
    void auditService.log({ userId, action: 'outcome.updated', resource: 'learning_outcome', resourceId: id })
    return o
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.learningOutcome.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Learning Outcome')
    await prisma.learningOutcome.delete({ where: { id } })
    void auditService.log({ userId, action: 'outcome.deleted', resource: 'learning_outcome', resourceId: id })
  },

  async getMappingMatrix(courseId: string, userId: string) {
    const outcomes = await prisma.learningOutcome.findMany({
      where: { courseId, OR: [{ createdBy: userId }, {}] },
      include: {
        questionMaps: { select: { questionId: true } },
        assessmentMaps: { select: { assessmentId: true } },
      },
    })
    const questions = await prisma.question.findMany({
      where: { courseId },
      select: { id: true, text: true, type: true, bloomLevel: true },
    })
    return { outcomes, questions }
  },
}
