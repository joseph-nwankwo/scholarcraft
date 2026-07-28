import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { ModerationStatus } from '@prisma/client'

export const moderationService = {
  async submitForReview(questionId: string, userId: string) {
    const q = await prisma.question.findFirst({ where: { id: questionId, createdBy: userId } })
    if (!q) throw AppError.notFound('Question')
    if (q.moderationStatus !== 'DRAFT' && q.moderationStatus !== 'NEEDS_REVISION') {
      throw AppError.badRequest('Question is not in a submittable state')
    }

    await prisma.question.update({ where: { id: questionId }, data: { moderationStatus: 'PENDING_REVIEW' } })
    const mod = await prisma.questionModeration.upsert({
      where: { questionId },
      create: { questionId, status: 'PENDING_REVIEW' },
      update: { status: 'PENDING_REVIEW', feedback: null, reviewedAt: null, reviewerId: null },
    })
    void auditService.log({ userId, action: 'question.submitted_for_review', resource: 'question', resourceId: questionId })
    return mod
  },

  async getQueue(_reviewerId: string, status?: ModerationStatus) {
    const where: Record<string, unknown> = {}
    if (status) where.status = status
    else where.status = 'PENDING_REVIEW'

    return prisma.questionModeration.findMany({
      where,
      include: {
        question: {
          include: {
            creator: { select: { id: true, name: true } },
            options: { orderBy: { orderIndex: 'asc' } },
            course: { select: { id: true, code: true, title: true } },
          },
        },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async approve(questionId: string, reviewerId: string, feedback?: string) {
    const mod = await prisma.questionModeration.findUnique({ where: { questionId } })
    if (!mod) throw AppError.notFound('Moderation record')
    if (mod.status !== 'PENDING_REVIEW') throw AppError.badRequest('Not pending review')

    await Promise.all([
      prisma.question.update({ where: { id: questionId }, data: { moderationStatus: 'APPROVED', isPublic: true } }),
      prisma.questionModeration.update({
        where: { questionId },
        data: { status: 'APPROVED', reviewerId, feedback, reviewedAt: new Date() },
      }),
    ])
    void auditService.log({ userId: reviewerId, action: 'question.approved', resource: 'question', resourceId: questionId })
  },

  async reject(questionId: string, reviewerId: string, feedback: string) {
    if (!feedback?.trim()) throw AppError.badRequest('Feedback is required for rejection')
    const mod = await prisma.questionModeration.findUnique({ where: { questionId } })
    if (!mod) throw AppError.notFound('Moderation record')

    await Promise.all([
      prisma.question.update({ where: { id: questionId }, data: { moderationStatus: 'REJECTED' } }),
      prisma.questionModeration.update({
        where: { questionId },
        data: { status: 'REJECTED', reviewerId, feedback, reviewedAt: new Date() },
      }),
    ])
    void auditService.log({ userId: reviewerId, action: 'question.rejected', resource: 'question', resourceId: questionId })
  },

  async requestRevision(questionId: string, reviewerId: string, feedback: string) {
    if (!feedback?.trim()) throw AppError.badRequest('Feedback is required for revision request')
    const mod = await prisma.questionModeration.findUnique({ where: { questionId } })
    if (!mod) throw AppError.notFound('Moderation record')

    await Promise.all([
      prisma.question.update({ where: { id: questionId }, data: { moderationStatus: 'NEEDS_REVISION' } }),
      prisma.questionModeration.update({
        where: { questionId },
        data: { status: 'NEEDS_REVISION', reviewerId, feedback, reviewedAt: new Date() },
      }),
    ])
    void auditService.log({ userId: reviewerId, action: 'question.revision_requested', resource: 'question', resourceId: questionId })
  },

  async getHistory(questionId: string) {
    return prisma.questionModeration.findUnique({
      where: { questionId },
      include: {
        reviewer: { select: { id: true, name: true } },
        question: { select: { id: true, text: true, type: true, moderationStatus: true } },
      },
    })
  },

  async stats() {
    const [pending, approved, rejected, needsRevision] = await Promise.all([
      prisma.questionModeration.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.questionModeration.count({ where: { status: 'APPROVED' } }),
      prisma.questionModeration.count({ where: { status: 'REJECTED' } }),
      prisma.questionModeration.count({ where: { status: 'NEEDS_REVISION' } }),
    ])
    return { pending, approved, rejected, needsRevision, total: pending + approved + rejected + needsRevision }
  },
}
