import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { shareService } from '../services/share/share.service'

export const shareController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const { expiresAt, allowDownload, allowEdit, allowComment, password } = req.body as {
      expiresAt?: string; allowDownload?: boolean; allowEdit?: boolean; allowComment?: boolean; password?: string
    }
    const link = await shareService.create(documentId, req.user!.userId, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      allowDownload, allowEdit, allowComment, password,
    })
    res.status(201).json({ status: 'success', data: { ...link, passwordHash: undefined } })
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const data = await shareService.list(documentId, req.user!.userId)
    res.json({ status: 'success', data: data.map((l) => ({ ...l, passwordHash: undefined })) })
  }),

  validate: asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params as { token: string }
    const { password } = req.body as { password?: string }
    const data = await shareService.validate(token, password)
    res.json({ status: 'success', data })
  }),

  revoke: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    await shareService.revoke(id, req.user!.userId)
    res.json({ status: 'success' })
  }),
}
