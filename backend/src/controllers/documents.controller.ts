import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'

const qs = (v: unknown): string | undefined => (typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined)

export const documentsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(qs(req.query.page) ?? '1'))
    const pageSize = Math.min(100, parseInt(qs(req.query.pageSize) ?? '20'))
    const type = qs(req.query.type)
    const courseId = qs(req.query.courseId)
    const search = qs(req.query.search)
    const skip = (page - 1) * pageSize

    const where = {
      userId: req.user!.userId,
      ...(type ? { type: type as never } : {}),
      ...(courseId ? { courseId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [documents, count] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize,
        select: { id: true, title: true, type: true, tags: true, version: true, sizeBytes: true, courseId: true, createdAt: true, updatedAt: true },
      }),
      prisma.document.count({ where }),
    ])

    res.json({ status: 'success', data: documents, count, page, pageSize, totalPages: Math.ceil(count / pageSize) })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) throw AppError.notFound('Document')
    if (doc.userId !== req.user!.userId && !doc.isPublic) throw AppError.forbidden()
    res.json({ status: 'success', document: doc })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) throw AppError.notFound('Document')
    if (doc.userId !== req.user!.userId) throw AppError.forbidden()

    const updated = await prisma.document.update({ where: { id }, data: { ...req.body, version: { increment: 1 } } })
    res.json({ status: 'success', document: updated })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id = String(req.params.id)
    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) throw AppError.notFound('Document')
    if (doc.userId !== req.user!.userId) throw AppError.forbidden()

    await prisma.document.delete({ where: { id } })
    res.json({ status: 'success', message: 'Document deleted' })
  }),
}
