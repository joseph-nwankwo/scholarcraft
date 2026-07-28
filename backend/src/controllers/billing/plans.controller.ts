import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { subscriptionService } from '../../services/billing/subscription.service'

export const plansController = {
  list: asyncHandler(async (_req, res) => {
    const plans = await subscriptionService.getPlans()
    res.json({ success: true, data: plans })
  }) as RequestHandler,

  get: asyncHandler(async (req, res) => {
    const plan = await subscriptionService.getPlan(req.params.id as string)
    res.json({ success: true, data: plan })
  }) as RequestHandler,
}
