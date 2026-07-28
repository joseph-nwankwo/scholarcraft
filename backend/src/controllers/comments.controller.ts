import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { commentService } from '../services/comment/comment.service'

export const commentsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const data = await commentService.list(documentId)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const { content, parentId } = req.body as { content: string; parentId?: string }
    if (!content?.trim()) throw AppError.badRequest('content is required')
    const comment = await commentService.create(documentId, req.user!.userId, content, parentId)
    res.status(201).json({ status: 'success', data: comment })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { content } = req.body as { content: string }
    if (!content?.trim()) throw AppError.badRequest('content is required')
    const comment = await commentService.update(id, req.user!.userId, content)
    res.json({ status: 'success', data: comment })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await commentService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  resolve: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const comment = await commentService.resolve(id, req.user!.userId)
    res.json({ status: 'success', data: comment })
  }),

  unresolve: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const comment = await commentService.unresolve(id)
    res.json({ status: 'success', data: comment })
  }),
}
