import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { templateService } from '../services/document/template.service'

export const templateController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { category } = req.query as { category?: string }
    const templates = await templateService.list(req.user!.institutionId, category)
    res.json({ status: 'success', data: templates })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const t = await templateService.get(String(req.params.id))
    res.json({ status: 'success', data: t })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, category, prompt, systemPrompt, variables, isPublic } = req.body as {
      name: string; category: string; prompt: string; systemPrompt?: string
      variables?: unknown[]; isPublic?: boolean
    }
    if (!name || !category || !prompt) throw AppError.badRequest('name, category, and prompt are required')

    const t = await templateService.create({
      name, category, prompt, systemPrompt, variables,
      isPublic: isPublic ?? false,
      institutionId: req.user!.institutionId ?? undefined,
      createdBy: req.user!.userId,
    })
    res.status(201).json({ status: 'success', data: t })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const t = await templateService.update(String(req.params.id), req.user!.userId, req.body as never)
    res.json({ status: 'success', data: t })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await templateService.delete(String(req.params.id), req.user!.userId)
    res.json({ status: 'success', message: 'Template deleted' })
  }),
}
