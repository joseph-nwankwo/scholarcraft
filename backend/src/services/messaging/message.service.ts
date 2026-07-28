import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { MessageType } from '@prisma/client'

interface SendMessageData {
  conversationId: string
  senderId: string
  content: string
  messageType?: MessageType
  attachments?: unknown[]
  threadId?: string
}

export const messageService = {
  async send(data: SendMessageData) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: data.conversationId, userId: data.senderId } },
    })
    if (!member) throw AppError.forbidden('Not a member of this conversation')

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        messageType: data.messageType ?? 'TEXT',
        attachments: (data.attachments ?? []) as never,
        threadId: data.threadId,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        reactions: true,
        mentions: true,
      },
    })

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: new Date() },
    })

    // Extract and save @mentions
    const mentionedNames = extractMentions(data.content)
    if (mentionedNames.length > 0) {
      const conv = await prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { members: { include: { user: true } } },
      })
      if (conv) {
        const mentionedUsers = conv.members.filter((m) =>
          mentionedNames.some((name) =>
            m.user.name.toLowerCase().includes(name.toLowerCase())
          )
        )
        if (mentionedUsers.length > 0) {
          await prisma.mention.createMany({
            data: mentionedUsers.map((m) => ({
              messageId: message.id,
              mentionedById: data.senderId,
              userId: m.userId,
              entityType: 'message',
              entityId: message.id,
            })),
          })

          // Create notifications for mentions
          const notifData = mentionedUsers
            .filter((m) => m.userId !== data.senderId)
            .map((m) => ({
              userId: m.userId,
              type: 'MENTION' as const,
              title: 'You were mentioned',
              message: `${message.sender.name} mentioned you in a message`,
              data: { conversationId: data.conversationId, messageId: message.id } as never,
              priority: 'NORMAL' as const,
              category: 'MESSAGES' as const,
              actionUrl: `/messages/${data.conversationId}`,
            }))
          if (notifData.length > 0) {
            await prisma.notification.createMany({ data: notifData as never })
          }
        }
      }
    }

    return message
  },

  async getMessages(conversationId: string, userId: string, opts?: {
    page?: number; limit?: number; before?: string; threadId?: string
  }) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!member) throw AppError.forbidden('Not a member of this conversation')

    const limit = opts?.limit ?? 50
    const where = {
      conversationId,
      deleted: false,
      ...(opts?.threadId ? { threadId: opts.threadId } : { threadId: null }),
      ...(opts?.before ? { createdAt: { lt: new Date(opts.before) } } : {}),
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        _count: { select: { replies: true } },
      },
    })

    return messages.reverse()
  },

  async edit(messageId: string, userId: string, content: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message) throw AppError.notFound('Message')
    if (message.senderId !== userId) throw AppError.forbidden('Can only edit your own messages')
    if (message.deleted) throw AppError.badRequest('Cannot edit a deleted message')

    return prisma.message.update({
      where: { id: messageId },
      data: { content, edited: true },
      include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async delete(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } })
    if (!message) throw AppError.notFound('Message')
    if (message.senderId !== userId) throw AppError.forbidden('Can only delete your own messages')

    return prisma.message.update({
      where: { id: messageId },
      data: { deleted: true, content: '' },
    })
  },

  async react(messageId: string, userId: string, emoji: string) {
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    })
    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } })
      return { action: 'removed', emoji }
    }
    await prisma.messageReaction.create({ data: { messageId, userId, emoji } })
    return { action: 'added', emoji }
  },

  async pin(messageId: string, userId: string, conversationId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    })
    if (!member) throw AppError.forbidden()

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { pinnedAt: new Date() },
    })
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinnedMessage: messageId },
    })
    return message
  },

  async search(_institutionId: string, userId: string, query: string, opts?: { limit?: number }) {
    const limit = opts?.limit ?? 20
    const userConvs = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    })
    const convIds = userConvs.map((c) => c.conversationId)

    return prisma.message.findMany({
      where: {
        conversationId: { in: convIds },
        content: { contains: query, mode: 'insensitive' },
        deleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: { select: { id: true, name: true } },
        conversation: { select: { id: true, name: true, type: true } },
      },
    })
  },
}

function extractMentions(content: string): string[] {
  const matches = content.match(/@(\w[\w\s]*?)(?=\s|$|@)/g) ?? []
  return matches.map((m) => m.slice(1).trim())
}
