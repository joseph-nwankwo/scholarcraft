import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true, role: true }

export const commentService = {
  async list(documentId: string) {
    // Return top-level comments with nested replies (2 levels deep)
    return prisma.comment.findMany({
      where: { documentId, parentId: null },
      include: {
        author: { select: AUTHOR_SELECT },
        replies: {
          include: {
            author: { select: AUTHOR_SELECT },
            replies: { include: { author: { select: AUTHOR_SELECT } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async create(documentId: string, authorId: string, content: string, parentId?: string) {
    if (parentId) {
      const parent = await prisma.comment.findFirst({ where: { id: parentId, documentId } })
      if (!parent) throw AppError.notFound('Parent comment')
    }
    const comment = await prisma.comment.create({
      data: { documentId, authorId, content, parentId: parentId ?? null },
      include: { author: { select: AUTHOR_SELECT } },
    })
    void auditService.log({ userId: authorId, action: 'comment.created', resource: 'document', resourceId: documentId })
    return comment
  },

  async update(id: string, authorId: string, content: string) {
    const comment = await prisma.comment.findFirst({ where: { id, authorId } })
    if (!comment) throw AppError.notFound('Comment')
    return prisma.comment.update({ where: { id }, data: { content }, include: { author: { select: AUTHOR_SELECT } } })
  },

  async delete(id: string, userId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id, OR: [{ authorId: userId }] },
    })
    if (!comment) throw AppError.notFound('Comment')
    await prisma.comment.delete({ where: { id } })
    void auditService.log({ userId, action: 'comment.deleted', resource: 'comment', resourceId: id })
  },

  async resolve(id: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id } })
    if (!comment) throw AppError.notFound('Comment')
    const updated = await prisma.comment.update({
      where: { id },
      data: { resolved: true, resolvedBy: userId, resolvedAt: new Date() },
    })
    void auditService.log({ userId, action: 'comment.resolved', resource: 'comment', resourceId: id })
    return updated
  },

  async unresolve(id: string) {
    return prisma.comment.update({
      where: { id },
      data: { resolved: false, resolvedBy: null, resolvedAt: null },
    })
  },

  async count(documentId: string) {
    return prisma.comment.count({ where: { documentId } })
  },
}
