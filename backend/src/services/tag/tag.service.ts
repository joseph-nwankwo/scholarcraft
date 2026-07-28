import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'

export const tagService = {
  async list(institutionId?: string) {
    return prisma.tag.findMany({
      where: { institutionId: institutionId ?? null },
      include: { _count: { select: { documentTags: true } } },
      orderBy: { name: 'asc' },
    })
  },

  async create(userId: string, institutionId: string | null, data: { name: string; color?: string }) {
    const existing = await prisma.tag.findFirst({
      where: { institutionId, name: { equals: data.name, mode: 'insensitive' } },
    })
    if (existing) throw AppError.conflict('Tag with this name already exists')

    const tag = await prisma.tag.create({
      data: { name: data.name, color: data.color ?? '#6366f1', institutionId },
    })
    void auditService.log({ userId, institutionId: institutionId ?? undefined, action: 'tag.created', resource: 'tag', resourceId: tag.id })
    return tag
  },

  async delete(id: string, userId: string, institutionId?: string) {
    const tag = await prisma.tag.findFirst({ where: { id, institutionId: institutionId ?? null } })
    if (!tag) throw AppError.notFound('Tag')
    await prisma.tag.delete({ where: { id } })
    void auditService.log({ userId, institutionId, action: 'tag.deleted', resource: 'tag', resourceId: id })
  },

  async attach(documentId: string, tagId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')
    await prisma.documentTag.upsert({
      where: { documentId_tagId: { documentId, tagId } },
      create: { documentId, tagId },
      update: {},
    })
    void auditService.log({ userId, action: 'tag.attached', resource: 'document', resourceId: documentId, metadata: { tagId } })
  },

  async detach(documentId: string, tagId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')
    await prisma.documentTag.delete({ where: { documentId_tagId: { documentId, tagId } } })
    void auditService.log({ userId, action: 'tag.detached', resource: 'document', resourceId: documentId, metadata: { tagId } })
  },

  async getDocumentTags(documentId: string) {
    return prisma.documentTag.findMany({
      where: { documentId },
      include: { tag: true },
    })
  },
}
