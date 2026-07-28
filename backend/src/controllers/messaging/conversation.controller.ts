import type { Response } from 'express'
import type { Request } from 'express'
import { conversationService } from '../../services/messaging/conversation.service'
import { asyncHandler } from '../../utils/asyncHandler'
import type { ConversationType } from '@prisma/client'

export const conversationController = {
  getOrCreateDirect: asyncHandler(async (req: Request, res: Response) => {
    const { targetUserId } = req.body
    const conv = await conversationService.getOrCreateDirect(
      req.user!.institutionId!,
      req.user!.userId,
      targetUserId
    )
    res.json({ success: true, data: conv })
  }),

  createGroup: asyncHandler(async (req: Request, res: Response) => {
    const { name, description, memberIds, workspaceId, type } = req.body
    const conv = await conversationService.createGroup(
      req.user!.institutionId!,
      req.user!.userId,
      { name, description, memberIds, workspaceId, type: type as ConversationType | undefined }
    )
    res.status(201).json({ success: true, data: conv })
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 30
    const result = await conversationService.getConversations(
      req.user!.userId,
      req.user!.institutionId!,
      { page, limit }
    )
    res.json({ success: true, ...result })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const conv = await conversationService.getConversation(req.params.id as string, req.user!.userId)
    res.json({ success: true, data: conv })
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await conversationService.markRead(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  mute: asyncHandler(async (req: Request, res: Response) => {
    await conversationService.muteConversation(req.params.id as string, req.user!.userId, req.body.muted)
    res.json({ success: true })
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    await conversationService.archiveConversation(req.params.id as string, req.user!.userId, req.body.archived)
    res.json({ success: true })
  }),

  addMembers: asyncHandler(async (req: Request, res: Response) => {
    const result = await conversationService.addMembers(req.params.id as string, req.user!.userId, req.body.userIds)
    res.json({ success: true, data: result })
  }),
}
