import { prisma } from '../../config/database'
import { logger } from '../../utils/logger'

export type AuditAction =
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.register_institution'
  | 'auth.password_reset_request'
  | 'auth.password_reset'
  | 'auth.email_verified'
  | 'auth.password_changed'
  | 'auth.session_terminated'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.suspended'
  | 'user.role_changed'
  | 'user.avatar_updated'
  | 'course.created'
  | 'course.updated'
  | 'course.deleted'
  | 'course.bulk_deleted'
  | 'course.lecturer_assigned'
  | 'course.lecturer_removed'
  | 'course.outcome_upserted'
  | 'course.outcome_deleted'
  | 'course.schedule_added'
  | 'course.schedule_updated'
  | 'course.schedule_deleted'
  | 'course.material_added'
  | 'course.material_deleted'
  | 'faculty.created'
  | 'faculty.updated'
  | 'faculty.deleted'
  | 'department.created'
  | 'department.updated'
  | 'department.deleted'
  | 'programme.created'
  | 'programme.updated'
  | 'programme.deleted'
  | 'academic_session.created'
  | 'academic_session.updated'
  | 'academic_session.deleted'
  | 'semester.created'
  | 'semester.updated'
  | 'semester.deleted'
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  | 'document.exported'
  | 'document.moved'
  | 'document.pinned'
  | 'document.unpinned'
  | 'document.trashed'
  | 'document.restored'
  | 'document.published'
  | 'document.favorited'
  | 'document.unfavorited'
  | 'document.shared'
  | 'folder.created'
  | 'folder.updated'
  | 'folder.deleted'
  | 'tag.created'
  | 'tag.deleted'
  | 'tag.attached'
  | 'tag.detached'
  | 'comment.created'
  | 'comment.deleted'
  | 'comment.resolved'
  | 'approval.submitted'
  | 'approval.approved'
  | 'approval.rejected'
  | 'approval.changes_requested'
  | 'share.created'
  | 'share.revoked'
  | 'export.completed'
  | 'export.failed'
  | 'ai.generated'
  | 'institution.updated'
  | 'settings.updated'
  | 'question.created'
  | 'question.updated'
  | 'question.deleted'
  | 'question.submitted_for_review'
  | 'question.approved'
  | 'question.rejected'
  | 'question.revision_requested'
  | 'assessment.created'
  | 'assessment.updated'
  | 'assessment.deleted'
  | 'rubric.created'
  | 'rubric.updated'
  | 'rubric.deleted'
  | 'outcome.created'
  | 'outcome.updated'
  | 'outcome.deleted'
  | 'analytics.event_tracked'
  | 'report.template_created'
  | 'report.template_deleted'
  | 'report.scheduled_created'
  | 'report.scheduled_updated'
  | 'report.generated'

interface LogInput {
  userId?: string
  institutionId?: string
  action: AuditAction
  resource?: string
  resourceId?: string
  oldValue?: unknown
  newValue?: unknown
  ip?: string
  userAgent?: string
  metadata?: Record<string, unknown>
}

export const auditService = {
  async log(input: LogInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId:        input.userId       ?? null,
          institutionId: input.institutionId ?? null,
          action:        input.action,
          resource:      input.resource     ?? null,
          resourceId:    input.resourceId   ?? null,
          oldValue:      input.oldValue     ? (input.oldValue as object) : undefined,
          newValue:      input.newValue     ? (input.newValue as object) : undefined,
          ip:            input.ip           ?? null,
          userAgent:     input.userAgent    ?? null,
          metadata:      input.metadata     ? (input.metadata as object) : undefined,
        },
      })
    } catch (err) {
      logger.error('Failed to write audit log', { error: err, input })
    }
  },

  async list(institutionId: string, opts: { page?: number; limit?: number; action?: string; userId?: string } = {}) {
    const page  = opts.page  ?? 1
    const limit = opts.limit ?? 50
    const skip  = (page - 1) * limit

    const where = {
      institutionId,
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.userId ? { userId: opts.userId }  : {}),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total, page, totalPages: Math.ceil(total / limit) }
  },
}
