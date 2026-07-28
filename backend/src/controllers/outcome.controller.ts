import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { outcomeService } from '../services/assessment/outcome.service'
import type { BloomLevel } from '@prisma/client'

export const outcomeController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { courseId, bloomLevel, page, limit } = req.query
    const data = await outcomeService.list(req.user!.userId, req.user!.institutionId ?? null, {
      courseId: courseId as string | undefined,
      bloomLevel: bloomLevel as BloomLevel | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })
    res.json({ status: 'success', ...data })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await outcomeService.get(id, req.user!.userId, req.user!.institutionId ?? null)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await outcomeService.create(req.user!.userId, req.user!.institutionId ?? null, req.body)
    res.status(201).json({ status: 'success', data })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await outcomeService.update(id, req.user!.userId, req.body)
    res.json({ status: 'success', data })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await outcomeService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  matrix: asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params as { courseId: string }
    const data = await outcomeService.getMappingMatrix(courseId, req.user!.userId)
    res.json({ status: 'success', data })
  }),
}
