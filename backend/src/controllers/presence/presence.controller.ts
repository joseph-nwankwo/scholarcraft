import type { Response } from 'express'
import type { Request } from 'express'
import { presenceService } from '../../services/presence/presence.service'
import { asyncHandler } from '../../utils/asyncHandler'
import type { PresenceStatus } from '@prisma/client'

export const presenceController = {
  setPresence: asyncHandler(async (req: Request, res: Response) => {
    const { status, statusText } = req.body
    const presence = await presenceService.setPresence(req.user!.userId, status as PresenceStatus, statusText)
    res.json({ success: true, data: presence })
  }),

  getPresence: asyncHandler(async (req: Request, res: Response) => {
    const presence = await presenceService.getPresence(req.params.userId as string)
    res.json({ success: true, data: presence })
  }),

  getBulkPresence: asyncHandler(async (req: Request, res: Response) => {
    const { userIds } = req.body
    const presenceMap = await presenceService.getBulkPresence(userIds as string[])
    const data = Object.fromEntries(presenceMap)
    res.json({ success: true, data })
  }),
}
