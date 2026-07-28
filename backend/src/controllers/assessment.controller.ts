import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { assessmentService } from '../services/assessment/assessment.service'
import type { AssessmentType, AssessmentStatus } from '@prisma/client'

export const assessmentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { type, status, courseId, search, page, limit } = req.query
    const data = await assessmentService.list(req.user!.userId, req.user!.institutionId ?? null, {
      type: type as AssessmentType | undefined,
      status: status as AssessmentStatus | undefined,
      courseId: courseId as string | undefined,
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    })
    res.json({ status: 'success', ...data })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await assessmentService.get(id, req.user!.userId)
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.create(req.user!.userId, req.user!.institutionId ?? null, req.body)
    res.status(201).json({ status: 'success', data })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await assessmentService.update(id, req.user!.userId, req.body)
    res.json({ status: 'success', data })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await assessmentService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  publish: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await assessmentService.publish(id, req.user!.userId)
    res.json({ status: 'success', data })
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await assessmentService.archive(id, req.user!.userId)
    res.json({ status: 'success', data })
  }),

  addQuestion: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const data = await assessmentService.addQuestion(id, req.user!.userId, req.body)
    res.status(201).json({ status: 'success', data })
  }),

  removeQuestion: asyncHandler(async (req: Request, res: Response) => {
    const { id, questionId } = req.params as { id: string; questionId: string }
    await assessmentService.removeQuestion(id, questionId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  reorderQuestions: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await assessmentService.reorderQuestions(id, req.user!.userId, req.body.order)
    res.json({ status: 'success' })
  }),

  mapOutcome: asyncHandler(async (req: Request, res: Response) => {
    const { id, outcomeId } = req.params as { id: string; outcomeId: string }
    await assessmentService.mapOutcome(id, outcomeId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  unmapOutcome: asyncHandler(async (req: Request, res: Response) => {
    const { id, outcomeId } = req.params as { id: string; outcomeId: string }
    await assessmentService.unmapOutcome(id, outcomeId, req.user!.userId)
    res.json({ status: 'success' })
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const data = await assessmentService.stats(req.user!.userId, req.user!.institutionId ?? null)
    res.json({ status: 'success', data })
  }),
}
