import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { ConversationType } from '@prisma/client'

export const conversationService = {
  async getOrCreateDirect(institutionId: string, userId: string, targetUserId: string) {
    const existing = await prisma.conversation.findFirst({
      where: {
        institutionId,
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    })
    if (existing) return existing

    return prisma.conversation.create({
      data: {
        institutionId,
        type: 'DIRECT',
        members: { create: [{ userId }, { userId: targetUserId }] },
      },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    })
  },

  async createGroup(institutionId: string, creatorId: string, data: {
    name: string; description?: string; memberIds: string[]
    workspaceId?: string; type?: ConversationType
  }) {
    const memberIds = [...new Set([creatorId, ...data.memberIds])]
    return prisma.conversation.create({
      data: {
        institutionId,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        type: data.type ?? 'GROUP',
        members: { create: memberIds.map((userId) => ({ userId })) },
      },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
    })
  },

  async getConversations(userId: string, institutionId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 30
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { institutionId, members: { some: { userId, archived: false } } },
        skip, take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.conversation.count({ where: { institutionId, members: { some: { userId } } } }),
    ])

    // Attach unread count
    const memberData = await prisma.conversationMember.findMany({
      where: { userId, conversationId: { in: items.map((c) => c.id) } },
    })
    const memberMap = Object.fromEntries(memberData.map((m) => [m.conversationId, m]))

    const enriched = await Promise.all(items.map(async (conv) => {
      const member = memberMap[conv.id]
      const unread = member?.lastReadAt
        ? await prisma.message.count({
            where: { conversationId: conv.id, createdAt: { gt: member.lastReadAt }, senderId: { not: userId } },
          })
        : 0
      return { ...conv, unread }
    }))

    return { items: enriched, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getConversation(id: string, userId: string) {
    const conv = await prisma.conversation.findFirst({
      where: { id, members: { some: { userId } } },
      include: { members: { include: { user: { select: { id: true, name: true, avatarUrl: true, department: true } } } } },
    })
    if (!conv) throw AppError.notFound('Conversation')
    return conv
  },

  async markRead(conversationId: string, userId: string) {
    return prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    })
  },

  async muteConversation(conversationId: string, userId: string, muted: boolean) {
    return prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { muted },
    })
  },

  async archiveConversation(conversationId: string, userId: string, archived: boolean) {
    return prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { archived },
    })
  },

  async addMembers(conversationId: string, actorId: string, userIds: string[]) {
    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId: actorId } } },
    })
    if (!conv) throw AppError.notFound('Conversation')
    if (conv.type === 'DIRECT') throw AppError.badRequest('Cannot add members to a direct conversation')

    const existing = await prisma.conversationMember.findMany({ where: { conversationId } })
    const existingIds = new Set(existing.map((m) => m.userId))
    const toAdd = userIds.filter((id) => !existingIds.has(id))

    if (toAdd.length === 0) return { added: 0 }
    await prisma.conversationMember.createMany({ data: toAdd.map((userId) => ({ conversationId, userId })) })
    return { added: toAdd.length }
  },
}
