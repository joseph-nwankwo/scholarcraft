import { prisma } from '../../config/database'

interface LogActivityData {
  institutionId: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  entityTitle?: string
  workspaceId?: string
  metadata?: Record<string, unknown>
}

export const activityService = {
  async log(data: LogActivityData) {
    return prisma.activityFeed.create({
      data: {
        institutionId: data.institutionId,
        workspaceId: data.workspaceId,
        actorId: data.actorId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        entityTitle: data.entityTitle,
        metadata: (data.metadata ?? {}) as never,
      },
    })
  },

  async getInstitutionFeed(institutionId: string, opts?: {
    page?: number; limit?: number; actorId?: string; entityType?: string
  }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 30
    const skip = (page - 1) * limit

    const where = {
      institutionId,
      ...(opts?.actorId ? { actorId: opts.actorId } : {}),
      ...(opts?.entityType ? { entityType: opts.entityType } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.activityFeed.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getWorkspaceFeed(workspaceId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where: { workspaceId }, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.activityFeed.count({ where: { workspaceId } }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getUserFeed(actorId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.activityFeed.findMany({
        where: { actorId }, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.activityFeed.count({ where: { actorId } }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },
}

export const ACTION = {
  DOCUMENT_CREATED: 'document.created',
  DOCUMENT_UPDATED: 'document.updated',
  DOCUMENT_APPROVED: 'document.approved',
  AI_GENERATED: 'ai.generated',
  ASSESSMENT_CREATED: 'assessment.created',
  COMMENT_ADDED: 'comment.added',
  APPROVAL_SUBMITTED: 'approval.submitted',
  APPROVAL_APPROVED: 'approval.approved',
  WORKSPACE_JOINED: 'workspace.joined',
  MESSAGE_SENT: 'message.sent',
  BILLING_UPGRADED: 'billing.upgraded',
  CALENDAR_CREATED: 'calendar.created',
} as const
