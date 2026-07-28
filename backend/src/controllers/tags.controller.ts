import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { tagService } from '../services/tag/tag.service'

export const tagsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await tagService.list(req.user!.institutionId ?? undefined)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, color } = req.body as { name: string; color?: string }
    if (!name?.trim()) throw AppError.badRequest('name is required')
    const tag = await tagService.create(req.user!.userId, req.user!.institutionId ?? null, { name, color })
    res.status(201).json({ status: 'success', data: tag })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await tagService.delete(id, req.user!.userId, req.user!.institutionId ?? undefined)
    res.json({ status: 'success' })
  }),

  attach: asyncHandler(async (req: Request, res: Response) => {
    const { documentId, tagId } = req.body as { documentId: string; tagId: string }
    if (!documentId || !tagId) throw AppError.badRequest('documentId and tagId required')
    await tagService.attach(documentId, tagId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  detach: asyncHandler(async (req: Request, res: Response) => {
    const { documentId, tagId } = req.body as { documentId: string; tagId: string }
    if (!documentId || !tagId) throw AppError.badRequest('documentId and tagId required')
    await tagService.detach(documentId, tagId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  getDocumentTags: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const data = await tagService.getDocumentTags(documentId)
    res.json({ status: 'success', data })
  }),
}
