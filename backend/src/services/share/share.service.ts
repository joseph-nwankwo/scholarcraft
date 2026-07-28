import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import crypto from 'crypto'

export const shareService = {
  async create(documentId: string, userId: string, opts: {
    expiresAt?: Date
    allowDownload?: boolean
    allowEdit?: boolean
    allowComment?: boolean
    password?: string
  }) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')

    const token = crypto.randomBytes(24).toString('base64url')
    const passwordHash = opts.password ? crypto.createHash('sha256').update(opts.password).digest('hex') : null

    const link = await prisma.shareLink.create({
      data: {
        documentId,
        token,
        createdBy: userId,
        expiresAt: opts.expiresAt ?? null,
        allowDownload: opts.allowDownload ?? true,
        allowEdit: opts.allowEdit ?? false,
        allowComment: opts.allowComment ?? false,
        passwordHash,
      },
    })

    void auditService.log({ userId, action: 'share.created', resource: 'document', resourceId: documentId, metadata: { token } })
    return link
  },

  async list(documentId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')
    return prisma.shareLink.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async validate(token: string, password?: string) {
    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        document: {
          include: { user: { select: { id: true, name: true } }, currentVersion: true },
        },
      },
    })
    if (!link) throw AppError.notFound('Share link')
    if (link.expiresAt && link.expiresAt < new Date()) throw AppError.badRequest('This link has expired')

    if (link.passwordHash) {
      if (!password) throw AppError.badRequest('Password required')
      const hash = crypto.createHash('sha256').update(password).digest('hex')
      if (hash !== link.passwordHash) throw AppError.unauthorized('Incorrect password')
    }

    // Increment view count
    await prisma.shareLink.update({ where: { token }, data: { viewCount: { increment: 1 } } })

    return {
      ...link,
      passwordHash: undefined, // never expose
    }
  },

  async revoke(id: string, userId: string) {
    const link = await prisma.shareLink.findFirst({ where: { id, createdBy: userId } })
    if (!link) throw AppError.notFound('Share link')
    await prisma.shareLink.delete({ where: { id } })
    void auditService.log({ userId, action: 'share.revoked', resource: 'share', resourceId: id })
  },
}
