import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { approvalService } from '../services/approval/approval.service'
import type { ApprovalStage } from '@prisma/client'

export const approvalController = {
  submit: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const workflow = await approvalService.submit(documentId, req.user!.userId)
    res.status(201).json({ status: 'success', data: workflow })
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params as { documentId: string }
    const data = await approvalService.getHistory(documentId)
    res.json({ status: 'success', data })
  }),

  queue: asyncHandler(async (req: Request, res: Response) => {
    const { stage } = req.query as { stage?: string }
    const data = await approvalService.getPendingForUser(req.user!.userId, stage as ApprovalStage | undefined)
    res.json({ status: 'success', data })
  }),

  approve: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { comments } = req.body as { comments?: string }
    await approvalService.approve(id, req.user!.userId, comments)
    res.json({ status: 'success', message: 'Approved' })
  }),

  reject: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { comments } = req.body as { comments?: string }
    await approvalService.reject(id, req.user!.userId, comments)
    res.json({ status: 'success', message: 'Rejected' })
  }),

  requestChanges: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { comments } = req.body as { comments: string }
    if (!comments?.trim()) throw AppError.badRequest('comments required')
    await approvalService.requestChanges(id, req.user!.userId, comments)
    res.json({ status: 'success', message: 'Changes requested' })
  }),
}
