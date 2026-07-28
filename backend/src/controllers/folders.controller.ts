import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { folderService } from '../services/folder/folder.service'

export const foldersController = {
  tree: asyncHandler(async (req: Request, res: Response) => {
    const data = await folderService.tree(req.user!.userId, req.user!.institutionId ?? undefined)
    res.json({ status: 'success', data })
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { parentId } = req.query as { parentId?: string }
    const data = await folderService.list(
      req.user!.userId,
      req.user!.institutionId ?? undefined,
      parentId === 'null' ? null : parentId,
    )
    res.json({ status: 'success', data })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, parentId, color, icon } = req.body as { name: string; parentId?: string; color?: string; icon?: string }
    if (!name?.trim()) throw AppError.badRequest('name is required')
    const folder = await folderService.create(
      req.user!.userId,
      req.user!.institutionId ?? null,
      { name, parentId, color, icon },
    )
    res.status(201).json({ status: 'success', data: folder })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { name, color, icon, parentId } = req.body as { name?: string; color?: string; icon?: string; parentId?: string | null }
    const folder = await folderService.update(id, req.user!.userId, { name, color, icon, parentId })
    res.json({ status: 'success', data: folder })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await folderService.delete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),
}
