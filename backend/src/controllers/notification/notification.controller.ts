import type { Response } from 'express'
import type { Request } from 'express'
import { notificationService } from '../../services/notification/notification.service'
import { asyncHandler } from '../../utils/asyncHandler'

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 30
    const result = await notificationService.getNotifications(req.user!.userId, {
      page, limit,
      unreadOnly: req.query.unreadOnly === 'true',
      category: req.query.category as string | undefined,
      archived: req.query.archived === 'true',
    })
    res.json({ success: true, ...result })
  }),

  unreadCount: asyncHandler(async (req: Request, res: Response) => {
    const count = await notificationService.getUnreadCount(req.user!.userId)
    res.json({ success: true, data: { count } })
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markRead(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllRead(req.user!.userId, req.body.category)
    res.json({ success: true })
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.archive(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  pin: asyncHandler(async (req: Request, res: Response) => {
    const notif = await notificationService.pin(req.params.id as string, req.user!.userId)
    res.json({ success: true, data: notif })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.delete(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  getMentions: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 20
    const result = await notificationService.getMentions(req.user!.userId, {
      page, limit,
      unreadOnly: req.query.unreadOnly === 'true',
    })
    res.json({ success: true, ...result })
  }),

  markMentionRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markMentionRead(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),
}
