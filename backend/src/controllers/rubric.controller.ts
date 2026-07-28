import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { rubricService } from '../services/assessment/rubric.service'

export const rubricController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { courseId, search, page, limit } = req.query
    const data = await rubricService.list(req.user!.userId, req.user!.institutionId ?? null, {
      courseId: courseId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })
    res.json({ status: 'success', ...data })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await rubricService.get(id, req.user!.userId, req.user!.institutionId ?? null)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await rubricService.create(req.user!.userId, req.user!.institutionId ?? null, req.body)
    res.status(201).json({ status: 'success', data })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await rubricService.update(id, req.user!.userId, req.body)
    res.json({ status: 'success', data })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await rubricService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),
}
