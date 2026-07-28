import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { questionService } from '../services/assessment/question.service'
import type { QuestionType, BloomLevel, DifficultyLevel, ModerationStatus } from '@prisma/client'

export const questionController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const { type, bloomLevel, difficulty, topic, moderationStatus, courseId, search, page, limit, isPublic } = req.query
    const data = await questionService.list(userId, institutionId ?? null, {
      type: type as QuestionType | undefined,
      bloomLevel: bloomLevel as BloomLevel | undefined,
      difficulty: difficulty as DifficultyLevel | undefined,
      topic: topic as string | undefined,
      moderationStatus: moderationStatus as ModerationStatus | undefined,
      courseId: courseId as string | undefined,
      search: search as string | undefined,
      isPublic: isPublic === 'true',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })
    res.json({ status: 'success', ...data })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await questionService.get(id, req.user!.userId, req.user!.institutionId ?? null)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await questionService.create(req.user!.userId, req.user!.institutionId ?? null, req.body)
    res.status(201).json({ status: 'success', data })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await questionService.update(id, req.user!.userId, req.body)
    res.json({ status: 'success', data })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await questionService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  bulkDelete: asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.body as { ids: string[] }
    await questionService.bulkDelete(ids, req.user!.userId)
    res.json({ status: 'success' })
  }),

  duplicate: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await questionService.duplicate(id, req.user!.userId, req.user!.institutionId ?? null)
    res.status(201).json({ status: 'success', data })
  }),

  importBulk: asyncHandler(async (req: Request, res: Response) => {
    const { questions } = req.body as { questions: unknown[] }
    const data = await questionService.importBulk(req.user!.userId, req.user!.institutionId ?? null, questions as Parameters<typeof questionService.importBulk>[2])
    res.status(201).json({ status: 'success', data })
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const data = await questionService.stats(req.user!.userId, req.user!.institutionId ?? null)
    res.json({ status: 'success', data })
  }),

  mapOutcome: asyncHandler(async (req: Request, res: Response) => {
    const { id, outcomeId } = req.params as { id: string; outcomeId: string }
    await questionService.mapToOutcome(id, outcomeId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  unmapOutcome: asyncHandler(async (req: Request, res: Response) => {
    const { id, outcomeId } = req.params as { id: string; outcomeId: string }
    await questionService.unmapOutcome(id, outcomeId, req.user!.userId)
    res.json({ status: 'success' })
  }),
}
