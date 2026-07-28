import type { Response } from 'express'
import type { Request } from 'express'
import { messageService } from '../../services/messaging/message.service'
import { asyncHandler } from '../../utils/asyncHandler'

export const messageController = {
  send: asyncHandler(async (req: Request, res: Response) => {
    const { conversationId, content, messageType, attachments, threadId } = req.body
    const message = await messageService.send({
      conversationId,
      senderId: req.user!.userId,
      content,
      messageType,
      attachments,
      threadId,
    })
    res.status(201).json({ success: true, data: message })
  }),

  getMessages: asyncHandler(async (req: Request, res: Response) => {
    const { before, threadId } = req.query
    const limit = Number(req.query.limit) || 50
    const messages = await messageService.getMessages(
      req.params.conversationId as string,
      req.user!.userId,
      {
        limit,
        before: before as string | undefined,
        threadId: threadId as string | undefined,
      }
    )
    res.json({ success: true, data: messages })
  }),

  edit: asyncHandler(async (req: Request, res: Response) => {
    const message = await messageService.edit(
      req.params.id as string,
      req.user!.userId,
      req.body.content
    )
    res.json({ success: true, data: message })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await messageService.delete(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  react: asyncHandler(async (req: Request, res: Response) => {
    const result = await messageService.react(
      req.params.id as string,
      req.user!.userId,
      req.body.emoji
    )
    res.json({ success: true, data: result })
  }),

  pin: asyncHandler(async (req: Request, res: Response) => {
    const message = await messageService.pin(
      req.params.id as string,
      req.user!.userId,
      req.body.conversationId
    )
    res.json({ success: true, data: message })
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query
    const limit = Number(req.query.limit) || 20
    const results = await messageService.search(
      req.user!.institutionId!,
      req.user!.userId,
      q as string,
      { limit }
    )
    res.json({ success: true, data: results })
  }),
}
