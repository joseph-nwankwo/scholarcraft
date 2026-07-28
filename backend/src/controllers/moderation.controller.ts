import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { moderationService } from '../services/assessment/moderation.service'
import type { ModerationStatus } from '@prisma/client'

export const moderationController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params as { questionId: string }
    const data = await moderationService.submitForReview(questionId, req.user!.userId)
    res.json({ status: 'success', data })
  }),

  queue: asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.query
    const data = await moderationService.getQueue(req.user!.userId, status as ModerationStatus | undefined)
    res.json({ status: 'success', data })
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params as { questionId: string }
    const { feedback } = req.body as { feedback?: string }
    await moderationService.approve(questionId, req.user!.userId, feedback)
    res.json({ status: 'success' })
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params as { questionId: string }
    const { feedback } = req.body as { feedback: string }
    await moderationService.reject(questionId, req.user!.userId, feedback)
    res.json({ status: 'success' })
  }),

  requestRevision: asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params as { questionId: string }
    const { feedback } = req.body as { feedback: string }
    await moderationService.requestRevision(questionId, req.user!.userId, feedback)
    res.json({ status: 'success' })
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const { questionId } = req.params as { questionId: string }
    const data = await moderationService.getHistory(questionId)
    res.json({ status: 'success', data })
  }),

  stats: asyncHandler(async (_req: Request, res: Response) => {
    const data = await moderationService.stats()
    res.json({ status: 'success', data })
  }),
}
