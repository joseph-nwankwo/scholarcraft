import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { NotificationType, NotificationPriority, NotificationCategory } from '@prisma/client'

interface CreateNotifData {
  userId: string
  institutionId?: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  priority?: NotificationPriority
  category?: NotificationCategory
  actionUrl?: string
}

export const notificationService = {
  async create(data: CreateNotifData) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        institutionId: data.institutionId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: (data.data ?? null) as never,
        priority: data.priority ?? 'NORMAL',
        category: data.category ?? 'SYSTEM',
        actionUrl: data.actionUrl,
      },
    })
  },

  async createMany(items: CreateNotifData[]) {
    return prisma.notification.createMany({
      data: items.map((d) => ({
        userId: d.userId,
        institutionId: d.institutionId,
        type: d.type,
        title: d.title,
        message: d.message,
        data: (d.data ?? null) as never,
        priority: d.priority ?? 'NORMAL',
        category: d.category ?? 'SYSTEM',
        actionUrl: d.actionUrl,
      })),
    })
  },

  async getNotifications(userId: string, opts?: {
    page?: number; limit?: number; unreadOnly?: boolean
    category?: string; archived?: boolean
  }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 30
    const skip = (page - 1) * limit

    const where = {
      userId,
      archived: opts?.archived ?? false,
      ...(opts?.unreadOnly ? { isRead: false } : {}),
      ...(opts?.category ? { category: opts.category as NotificationCategory } : {}),
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where, skip, take: limit, orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false, archived: false } }),
    ])

    return { items, total, unreadCount, page, limit, pages: Math.ceil(total / limit) }
  },

  async markRead(id: string, _userId: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })
  },

  async markAllRead(userId: string, category?: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        ...(category ? { category: category as NotificationCategory } : {}),
      },
      data: { isRead: true, readAt: new Date() },
    })
  },

  async archive(id: string, _userId: string) {
    return prisma.notification.update({ where: { id }, data: { archived: true } })
  },

  async pin(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif || notif.userId !== userId) throw AppError.forbidden()
    return prisma.notification.update({ where: { id }, data: { pinned: !notif.pinned } })
  },

  async delete(id: string, userId: string) {
    const notif = await prisma.notification.findUnique({ where: { id } })
    if (!notif || notif.userId !== userId) throw AppError.forbidden()
    return prisma.notification.delete({ where: { id } })
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false, archived: false } })
  },

  async getMentions(userId: string, opts?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const where = { userId, ...(opts?.unreadOnly ? { read: false } : {}) }
    const [items, total] = await Promise.all([
      prisma.mention.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          mentionedBy: { select: { id: true, name: true, avatarUrl: true } },
          message: { select: { id: true, content: true, conversationId: true } },
        },
      }),
      prisma.mention.count({ where }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async markMentionRead(mentionId: string, _userId: string) {
    return prisma.mention.update({ where: { id: mentionId }, data: { read: true } })
  },
}
