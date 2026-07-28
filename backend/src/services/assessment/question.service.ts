import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { QuestionType, BloomLevel, DifficultyLevel, ModerationStatus } from '@prisma/client'

interface QuestionOption {
  text: string
  isCorrect: boolean
  explanation?: string
  orderIndex?: number
}

interface CreateQuestionDTO {
  type: QuestionType
  bloomLevel?: BloomLevel
  difficulty?: DifficultyLevel
  topic?: string
  subject?: string
  text: string
  explanation?: string
  marks?: number
  timeSeconds?: number
  tags?: string[]
  isPublic?: boolean
  courseId?: string
  options?: QuestionOption[]
}

interface QuestionFilter {
  type?: QuestionType
  bloomLevel?: BloomLevel
  difficulty?: DifficultyLevel
  topic?: string
  moderationStatus?: ModerationStatus
  courseId?: string
  search?: string
  isPublic?: boolean
  page?: number
  limit?: number
}

const Q_SELECT = {
  id: true, type: true, bloomLevel: true, difficulty: true, topic: true, subject: true,
  text: true, explanation: true, marks: true, timeSeconds: true, tags: true,
  isPublic: true, moderationStatus: true, courseId: true, institutionId: true,
  createdAt: true, updatedAt: true,
  creator: { select: { id: true, name: true } },
  options: { orderBy: { orderIndex: 'asc' as const } },
  course: { select: { id: true, code: true, title: true } },
  _count: { select: { assessmentQs: true, outcomeMappings: true } },
}

export const questionService = {
  async list(userId: string, institutionId: string | null, filter: QuestionFilter) {
    const { page = 1, limit = 20, search, ...rest } = filter
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      OR: [{ createdBy: userId }, { isPublic: true, institutionId }],
    }
    if (rest.type) where.type = rest.type
    if (rest.bloomLevel) where.bloomLevel = rest.bloomLevel
    if (rest.difficulty) where.difficulty = rest.difficulty
    if (rest.topic) where.topic = { contains: rest.topic, mode: 'insensitive' }
    if (rest.courseId) where.courseId = rest.courseId
    if (rest.moderationStatus) where.moderationStatus = rest.moderationStatus
    if (search) where.text = { contains: search, mode: 'insensitive' }

    const [data, total] = await Promise.all([
      prisma.question.findMany({ where, select: Q_SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.question.count({ where }),
    ])
    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async get(id: string, userId: string, institutionId: string | null) {
    const q = await prisma.question.findFirst({
      where: { id, OR: [{ createdBy: userId }, { isPublic: true, institutionId }] },
      select: { ...Q_SELECT, outcomeMappings: { include: { outcome: true } } },
    })
    if (!q) throw AppError.notFound('Question')
    return q
  },

  async create(userId: string, institutionId: string | null, dto: CreateQuestionDTO) {
    const { options, ...rest } = dto
    const q = await prisma.question.create({
      data: {
        ...rest,
        createdBy: userId,
        institutionId,
        options: options ? { create: options.map((o, i) => ({ ...o, orderIndex: o.orderIndex ?? i })) } : undefined,
      },
      select: Q_SELECT,
    })
    void auditService.log({ userId, action: 'question.created', resource: 'question', resourceId: q.id })
    return q
  },

  async update(id: string, userId: string, dto: Partial<CreateQuestionDTO>) {
    const existing = await prisma.question.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Question')

    const { options, ...rest } = dto
    const q = await prisma.question.update({
      where: { id },
      data: {
        ...rest,
        ...(options !== undefined ? {
          options: {
            deleteMany: {},
            create: options.map((o, i) => ({ ...o, orderIndex: o.orderIndex ?? i })),
          },
        } : {}),
      },
      select: Q_SELECT,
    })
    void auditService.log({ userId, action: 'question.updated', resource: 'question', resourceId: id })
    return q
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.question.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Question')
    await prisma.question.delete({ where: { id } })
    void auditService.log({ userId, action: 'question.deleted', resource: 'question', resourceId: id })
  },

  async bulkDelete(ids: string[], userId: string) {
    await prisma.question.deleteMany({ where: { id: { in: ids }, createdBy: userId } })
  },

  async duplicate(id: string, userId: string, institutionId: string | null) {
    const source = await prisma.question.findFirst({
      where: { id, OR: [{ createdBy: userId }, { isPublic: true }] },
      include: { options: true },
    })
    if (!source) throw AppError.notFound('Question')
    return this.create(userId, institutionId, {
      type: source.type,
      bloomLevel: source.bloomLevel,
      difficulty: source.difficulty,
      topic: source.topic ?? undefined,
      subject: source.subject ?? undefined,
      text: `[Copy] ${source.text}`,
      explanation: source.explanation ?? undefined,
      marks: source.marks,
      timeSeconds: source.timeSeconds ?? undefined,
      tags: source.tags,
      isPublic: false,
      courseId: source.courseId ?? undefined,
      options: source.options.map((o) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        explanation: o.explanation ?? undefined,
        orderIndex: o.orderIndex,
      })),
    })
  },

  async importBulk(userId: string, institutionId: string | null, questions: CreateQuestionDTO[]) {
    const created = await Promise.all(questions.map((q) => this.create(userId, institutionId, q)))
    return { created: created.length }
  },

  async stats(userId: string, institutionId: string | null) {
    const where = { OR: [{ createdBy: userId }, { isPublic: true, institutionId }] }
    const [total, byType, byBloom, byDifficulty, byModeration] = await Promise.all([
      prisma.question.count({ where }),
      prisma.question.groupBy({ by: ['type'], _count: true, where }),
      prisma.question.groupBy({ by: ['bloomLevel'], _count: true, where }),
      prisma.question.groupBy({ by: ['difficulty'], _count: true, where }),
      prisma.question.groupBy({ by: ['moderationStatus'], _count: true, where }),
    ])
    return { total, byType, byBloom, byDifficulty, byModeration }
  },

  async mapToOutcome(questionId: string, outcomeId: string, userId: string) {
    const q = await prisma.question.findFirst({ where: { id: questionId, createdBy: userId } })
    if (!q) throw AppError.forbidden()
    await prisma.questionOutcomeMap.upsert({
      where: { questionId_outcomeId: { questionId, outcomeId } },
      create: { questionId, outcomeId },
      update: {},
    })
  },

  async unmapOutcome(questionId: string, outcomeId: string, userId: string) {
    const q = await prisma.question.findFirst({ where: { id: questionId, createdBy: userId } })
    if (!q) throw AppError.forbidden()
    await prisma.questionOutcomeMap.delete({
      where: { questionId_outcomeId: { questionId, outcomeId } },
    })
  },
}
