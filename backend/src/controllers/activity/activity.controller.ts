import type { Response } from 'express'
import type { Request } from 'express'
import { activityService } from '../../services/activity/activity.service'
import { asyncHandler } from '../../utils/asyncHandler'

export const activityController = {
  getInstitutionFeed: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 30
    const result = await activityService.getInstitutionFeed(req.user!.institutionId!, {
      page, limit,
      actorId: req.query.actorId as string | undefined,
      entityType: req.query.entityType as string | undefined,
    })
    res.json({ success: true, ...result })
  }),

  getWorkspaceFeed: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await activityService.getWorkspaceFeed(req.params.workspaceId as string, { page, limit })
    res.json({ success: true, ...result })
  }),

  getUserFeed: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const actorId = (req.params.userId as string) || req.user!.userId
    const result = await activityService.getUserFeed(actorId, { page, limit })
    res.json({ success: true, ...result })
  }),
}
