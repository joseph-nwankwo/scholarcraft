import { prisma } from '../../config/database'
import { auditService } from '../audit/audit.service'

const DOC_SELECT = {
  id: true, title: true, type: true, status: true, description: true,
  folderId: true, isPinned: true, isTrashed: true, isPublic: true,
  viewCount: true, createdAt: true, updatedAt: true,
  course: { select: { code: true, title: true } },
  currentVersion: { select: { version: true, wordCount: true } },
  _count: { select: { versions: true, comments: true, exports: true } },
  documentTags: { include: { tag: true } },
}

export const libraryService = {
  // ── Browsing ───────────────────────────────────────────────────────────────

  async list(userId: string, opts: {
    folderId?: string | null
    type?: string
    status?: string
    tagId?: string
    search?: string
    isPinned?: boolean
    isTrashed?: boolean
    showFavorites?: boolean
    page?: number
    limit?: number
  }) {
    const p = Math.max(1, opts.page ?? 1)
    const l = Math.min(50, opts.limit ?? 20)
    const skip = (p - 1) * l

    const where: Record<string, unknown> = {
      userId,
      isTrashed: opts.isTrashed ?? false,
      ...(opts.folderId !== undefined ? { folderId: opts.folderId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.isPinned ? { isPinned: true } : {}),
      ...(opts.search ? { title: { contains: opts.search, mode: 'insensitive' } } : {}),
      ...(opts.tagId ? { documentTags: { some: { tagId: opts.tagId } } } : {}),
      ...(opts.showFavorites ? { favorites: { some: { userId } } } : {}),
    }

    const [docs, total] = await Promise.all([
      prisma.document.findMany({ where, select: DOC_SELECT, orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }], skip, take: l }),
      prisma.document.count({ where }),
    ])

    return { docs, total, page: p, totalPages: Math.ceil(total / l) }
  },

  async recent(userId: string, limit = 10) {
    return prisma.document.findMany({
      where: { userId, isTrashed: false },
      select: DOC_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })
  },

  async stats(userId: string) {
    const [total, pinned, drafts, published, trashed, favorites] = await Promise.all([
      prisma.document.count({ where: { userId, isTrashed: false } }),
      prisma.document.count({ where: { userId, isPinned: true, isTrashed: false } }),
      prisma.document.count({ where: { userId, status: 'DRAFT', isTrashed: false } }),
      prisma.document.count({ where: { userId, status: 'PUBLISHED', isTrashed: false } }),
      prisma.document.count({ where: { userId, isTrashed: true } }),
      prisma.documentFavorite.count({ where: { userId } }),
    ])
    return { total, pinned, drafts, published, trashed, favorites }
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  async pin(id: string, userId: string, pin: boolean) {
    await assertOwner(id, userId)
    await prisma.document.update({ where: { id }, data: { isPinned: pin } })
    void auditService.log({ userId, action: pin ? 'document.pinned' : 'document.unpinned', resource: 'document', resourceId: id })
  },

  async trash(id: string, userId: string) {
    await assertOwner(id, userId)
    await prisma.document.update({ where: { id }, data: { isTrashed: true, trashedAt: new Date(), isPinned: false } })
    void auditService.log({ userId, action: 'document.trashed', resource: 'document', resourceId: id })
  },

  async restore(id: string, userId: string) {
    await assertOwner(id, userId)
    await prisma.document.update({ where: { id }, data: { isTrashed: false, trashedAt: null } })
    void auditService.log({ userId, action: 'document.restored', resource: 'document', resourceId: id })
  },

  async permanentDelete(id: string, userId: string) {
    await assertOwner(id, userId)
    await prisma.document.delete({ where: { id } })
  },

  async emptyTrash(userId: string) {
    const trashed = await prisma.document.findMany({ where: { userId, isTrashed: true }, select: { id: true } })
    await prisma.document.deleteMany({ where: { userId, isTrashed: true } })
    return trashed.length
  },

  async favorite(documentId: string, userId: string, add: boolean) {
    if (add) {
      await prisma.documentFavorite.upsert({
        where: { userId_documentId: { userId, documentId } },
        create: { userId, documentId },
        update: {},
      })
      void auditService.log({ userId, action: 'document.favorited', resource: 'document', resourceId: documentId })
    } else {
      await prisma.documentFavorite.deleteMany({ where: { userId, documentId } })
      void auditService.log({ userId, action: 'document.unfavorited', resource: 'document', resourceId: documentId })
    }
  },

  async move(documentIds: string[], folderId: string | null, userId: string) {
    await prisma.document.updateMany({
      where: { id: { in: documentIds }, userId },
      data: { folderId },
    })
    void auditService.log({ userId, action: 'document.moved', resource: 'document', metadata: { count: documentIds.length, folderId } })
  },

  async incrementView(id: string) {
    await prisma.document.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  },

  async globalSearch(userId: string, query: string, institutionId?: string) {
    // Prisma doesn't support two OR keys — use flat OR with combined predicates
    return prisma.document.findMany({
      where: {
        isTrashed: false,
        OR: [
          { userId, title: { contains: query, mode: 'insensitive' } },
          { userId, description: { contains: query, mode: 'insensitive' } },
          { userId, content: { contains: query, mode: 'insensitive' } },
          ...(institutionId ? [{ institutionId, isPublic: true, title: { contains: query, mode: 'insensitive' as const } }] : []),
        ],
      },
      select: DOC_SELECT,
      orderBy: { updatedAt: 'desc' },
      take: 30,
    })
  },
}

async function assertOwner(id: string, userId: string) {
  const doc = await prisma.document.findFirst({ where: { id, userId }, select: { id: true } })
  if (!doc) throw { status: 404, message: 'Document not found' }
  return doc
}
