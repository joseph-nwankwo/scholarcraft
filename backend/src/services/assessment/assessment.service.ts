import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { AssessmentType, AssessmentStatus } from '@prisma/client'

interface CreateAssessmentDTO {
  title: string
  description?: string
  type?: AssessmentType
  totalMarks?: number
  passMark?: number
  durationMins?: number
  instructions?: string
  shuffleQs?: boolean
  showAnswers?: boolean
  openDate?: string | Date | null
  dueDate?: string | Date | null
  allowLate?: boolean
  courseId?: string
  rubricId?: string
}

interface QuestionEntry {
  questionId: string
  orderIndex?: number
  marks?: number
  required?: boolean
}

const A_SELECT = {
  id: true, title: true, description: true, type: true, status: true,
  totalMarks: true, passMark: true, durationMins: true, instructions: true,
  shuffleQs: true, showAnswers: true,
  openDate: true, dueDate: true, allowLate: true,
  courseId: true, rubricId: true,
  createdAt: true, updatedAt: true,
  creator: { select: { id: true, name: true } },
  course: { select: { id: true, code: true, title: true } },
  _count: { select: { questions: true } },
}

export const assessmentService = {
  async list(userId: string, institutionId: string | null, opts: {
    type?: AssessmentType; status?: AssessmentStatus; courseId?: string; search?: string; page?: number; limit?: number
  }) {
    const { page = 1, limit = 20, search, ...rest } = opts
    const skip = (page - 1) * limit
    const where: Record<string, unknown> = {
      OR: [{ createdBy: userId }, { institutionId, status: 'PUBLISHED' }],
    }
    if (rest.type) where.type = rest.type
    if (rest.status) where.status = rest.status
    if (rest.courseId) where.courseId = rest.courseId
    if (search) where.title = { contains: search, mode: 'insensitive' }

    const [data, total] = await Promise.all([
      prisma.assessment.findMany({ where, select: A_SELECT, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      prisma.assessment.count({ where }),
    ])
    return { data, total, page, totalPages: Math.ceil(total / limit) }
  },

  async get(id: string, userId: string) {
    const a = await prisma.assessment.findFirst({
      where: { id, OR: [{ createdBy: userId }, { status: 'PUBLISHED' }] },
      include: {
        creator: { select: { id: true, name: true } },
        course: { select: { id: true, code: true, title: true } },
        rubric: { include: { criteria: { orderBy: { orderIndex: 'asc' } } } },
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            question: {
              include: { options: { orderBy: { orderIndex: 'asc' } } },
            },
          },
        },
        outcomeMaps: { include: { outcome: true } },
      },
    })
    if (!a) throw AppError.notFound('Assessment')
    return a
  },

  async create(userId: string, institutionId: string | null, dto: CreateAssessmentDTO) {
    const a = await prisma.assessment.create({
      data: { ...dto, createdBy: userId, institutionId },
      select: A_SELECT,
    })
    void auditService.log({ userId, action: 'assessment.created', resource: 'assessment', resourceId: a.id })
    return a
  },

  async update(id: string, userId: string, dto: Partial<CreateAssessmentDTO>) {
    const existing = await prisma.assessment.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Assessment')
    const a = await prisma.assessment.update({ where: { id }, data: dto, select: A_SELECT })
    void auditService.log({ userId, action: 'assessment.updated', resource: 'assessment', resourceId: id })
    return a
  },

  async delete(id: string, userId: string) {
    const existing = await prisma.assessment.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Assessment')
    await prisma.assessment.delete({ where: { id } })
    void auditService.log({ userId, action: 'assessment.deleted', resource: 'assessment', resourceId: id })
  },

  async publish(id: string, userId: string) {
    const existing = await prisma.assessment.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Assessment')
    return prisma.assessment.update({ where: { id }, data: { status: 'PUBLISHED' }, select: A_SELECT })
  },

  async archive(id: string, userId: string) {
    const existing = await prisma.assessment.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Assessment')
    return prisma.assessment.update({ where: { id }, data: { status: 'ARCHIVED' }, select: A_SELECT })
  },

  async addQuestion(assessmentId: string, userId: string, entry: QuestionEntry) {
    const a = await prisma.assessment.findFirst({ where: { id: assessmentId, createdBy: userId } })
    if (!a) throw AppError.notFound('Assessment')
    const count = await prisma.assessmentQuestion.count({ where: { assessmentId } })
    const aq = await prisma.assessmentQuestion.upsert({
      where: { assessmentId_questionId: { assessmentId, questionId: entry.questionId } },
      create: {
        assessmentId, questionId: entry.questionId,
        orderIndex: entry.orderIndex ?? count,
        marks: entry.marks,
        required: entry.required ?? true,
      },
      update: { marks: entry.marks, required: entry.required },
    })
    // Recalculate totalMarks
    await this.recalcTotalMarks(assessmentId)
    return aq
  },

  async removeQuestion(assessmentId: string, questionId: string, userId: string) {
    const a = await prisma.assessment.findFirst({ where: { id: assessmentId, createdBy: userId } })
    if (!a) throw AppError.notFound('Assessment')
    await prisma.assessmentQuestion.delete({
      where: { assessmentId_questionId: { assessmentId, questionId } },
    })
    await this.recalcTotalMarks(assessmentId)
  },

  async reorderQuestions(assessmentId: string, userId: string, order: Array<{ questionId: string; orderIndex: number }>) {
    const a = await prisma.assessment.findFirst({ where: { id: assessmentId, createdBy: userId } })
    if (!a) throw AppError.notFound('Assessment')
    await Promise.all(order.map(({ questionId, orderIndex }) =>
      prisma.assessmentQuestion.update({
        where: { assessmentId_questionId: { assessmentId, questionId } },
        data: { orderIndex },
      })
    ))
  },

  async recalcTotalMarks(assessmentId: string) {
    const qs = await prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      include: { question: { select: { marks: true } } },
    })
    const totalMarks = qs.reduce((sum, q) => sum + (q.marks ?? q.question.marks), 0)
    await prisma.assessment.update({ where: { id: assessmentId }, data: { totalMarks } })
  },

  async mapOutcome(assessmentId: string, outcomeId: string, userId: string) {
    const a = await prisma.assessment.findFirst({ where: { id: assessmentId, createdBy: userId } })
    if (!a) throw AppError.forbidden()
    await prisma.assessmentOutcomeMap.upsert({
      where: { assessmentId_outcomeId: { assessmentId, outcomeId } },
      create: { assessmentId, outcomeId },
      update: {},
    })
  },

  async unmapOutcome(assessmentId: string, outcomeId: string, userId: string) {
    const a = await prisma.assessment.findFirst({ where: { id: assessmentId, createdBy: userId } })
    if (!a) throw AppError.forbidden()
    await prisma.assessmentOutcomeMap.delete({
      where: { assessmentId_outcomeId: { assessmentId, outcomeId } },
    })
  },

  async stats(userId: string, institutionId: string | null) {
    const where = { OR: [{ createdBy: userId }, { institutionId }] }
    const [total, byType, byStatus] = await Promise.all([
      prisma.assessment.count({ where }),
      prisma.assessment.groupBy({ by: ['type'], _count: true, where }),
      prisma.assessment.groupBy({ by: ['status'], _count: true, where }),
    ])
    return { total, byType, byStatus }
  },
}
