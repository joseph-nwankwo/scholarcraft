import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { libraryService } from '../services/library/library.service'

export const libraryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const { folderId, type, status, tagId, search, isPinned, isTrashed, favorites, page, limit } = req.query as Record<string, string>
    const result = await libraryService.list(userId, {
      folderId: folderId === 'null' ? null : folderId,
      type, status, tagId,
      search,
      isPinned: isPinned === 'true',
      isTrashed: isTrashed === 'true',
      showFavorites: favorites === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    })
    res.json({ status: 'success', ...result })
  }),

  recent: asyncHandler(async (req: Request, res: Response) => {
    const data = await libraryService.recent(req.user!.userId, Number(req.query.limit ?? 10))
    res.json({ status: 'success', data })
  }),

  stats: asyncHandler(async (req: Request, res: Response) => {
    const data = await libraryService.stats(req.user!.userId)
    res.json({ status: 'success', data })
  }),

  pin: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { pin = true } = req.body as { pin?: boolean }
    await libraryService.pin(id, req.user!.userId, pin)
    res.json({ status: 'success' })
  }),

  trash: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await libraryService.trash(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await libraryService.restore(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  permanentDelete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await libraryService.permanentDelete(id, req.user!.userId)
    res.json({ status: 'success' })
  }),

  emptyTrash: asyncHandler(async (req: Request, res: Response) => {
    const count = await libraryService.emptyTrash(req.user!.userId)
    res.json({ status: 'success', deleted: count })
  }),

  favorite: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { add = true } = req.body as { add?: boolean }
    await libraryService.favorite(id, req.user!.userId, add)
    res.json({ status: 'success' })
  }),

  move: asyncHandler(async (req: Request, res: Response) => {
    const { documentIds, folderId } = req.body as { documentIds: string[]; folderId: string | null }
    if (!Array.isArray(documentIds) || documentIds.length === 0) throw AppError.badRequest('documentIds required')
    await libraryService.move(documentIds, folderId ?? null, req.user!.userId)
    res.json({ status: 'success' })
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query as { q?: string }
    if (!q?.trim()) throw AppError.badRequest('Query required')
    const data = await libraryService.globalSearch(req.user!.userId, q, req.user!.institutionId ?? undefined)
    res.json({ status: 'success', data })
  }),
}
