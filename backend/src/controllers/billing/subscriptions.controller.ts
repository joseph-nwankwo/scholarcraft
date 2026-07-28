import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { subscriptionService } from '../../services/billing/subscription.service'
import { AppError } from '../../utils/errors'

export const subscriptionsController = {
  myCurrent: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('No institution linked to this account')
    const sub = await subscriptionService.getInstitutionSubscription(institutionId)
    res.json({ success: true, data: sub })
  }) as RequestHandler,

  create: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('No institution linked to this account')
    const { planId, couponCode, trialDays, autoRenew } = req.body
    const sub = await subscriptionService.createSubscription(institutionId, planId, { couponCode, trialDays, autoRenew })
    res.status(201).json({ success: true, data: sub })
  }) as RequestHandler,

  upgrade: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('No institution linked to this account')
    const { planId, prorate } = req.body
    const sub = await subscriptionService.upgradeSubscription(institutionId, planId, { prorate })
    res.json({ success: true, data: sub })
  }) as RequestHandler,

  cancel: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('No institution linked to this account')
    const { immediate } = req.body
    const sub = await subscriptionService.cancelSubscription(institutionId, immediate)
    res.json({ success: true, data: sub })
  }) as RequestHandler,

  resume: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden('No institution linked to this account')
    const sub = await subscriptionService.resumeSubscription(institutionId)
    res.json({ success: true, data: sub })
  }) as RequestHandler,

  // Admin
  adminList: asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query as Record<string, string>
    const result = await subscriptionService.getAllSubscriptions({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    })
    res.json({ success: true, ...result })
  }) as RequestHandler,

  adminStats: asyncHandler(async (_req, res) => {
    const stats = await subscriptionService.getSubscriptionStats()
    res.json({ success: true, data: stats })
  }) as RequestHandler,

  adminGet: asyncHandler(async (req, res) => {
    const { prisma } = await import('../../config/database')
    const sub = await prisma.institutionSubscription.findFirst({
      where: { OR: [{ id: req.params.id as string }, { institutionId: req.params.id as string }] },
      include: { institution: true, plan: true },
    })
    if (!sub) throw AppError.notFound('Subscription')
    res.json({ success: true, data: sub })
  }) as RequestHandler,
}
