import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

export const versionService = {
  async list(documentId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')

    return prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async create(documentId: string, userId: string, markdownContent: string, prompt?: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')

    const last = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    })

    const nextVersion = (last?.version ?? 0) + 1
    const wordCount = markdownContent.split(/\s+/).filter(Boolean).length

    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        markdownContent,
        wordCount,
        prompt,
        createdBy: userId,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })

    await prisma.document.update({
      where: { id: documentId },
      data: { currentVersionId: version.id, content: markdownContent, version: nextVersion },
    })

    return version
  },

  async restore(documentId: string, versionId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')

    const ver = await prisma.documentVersion.findFirst({ where: { id: versionId, documentId } })
    if (!ver) throw AppError.notFound('Version')

    const last = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    })
    const nextVersion = (last?.version ?? 0) + 1

    const restoredVersion = await prisma.documentVersion.create({
      data: {
        documentId,
        version: nextVersion,
        markdownContent: ver.markdownContent,
        wordCount: ver.wordCount,
        prompt: `Restored from version ${ver.version}`,
        createdBy: userId,
      },
    })

    await prisma.document.update({
      where: { id: documentId },
      data: { currentVersionId: restoredVersion.id, content: ver.markdownContent, version: nextVersion },
    })

    return restoredVersion
  },
}
