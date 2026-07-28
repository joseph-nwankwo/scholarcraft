import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { featureFlagService } from '../../services/billing/feature-flag.service'

export const featureFlagsController = {
  listAll: asyncHandler(async (_req, res) => {
    const flags = await featureFlagService.getAllFlags()
    res.json({ success: true, data: flags })
  }) as RequestHandler,

  listForPlan: asyncHandler(async (req, res) => {
    const flags = await featureFlagService.getFlagsForPlan(req.params.planId as string)
    res.json({ success: true, data: flags })
  }) as RequestHandler,

  set: asyncHandler(async (req, res) => {
    const { planId, name, enabled, metadata } = req.body
    const flag = await featureFlagService.setFlag(planId, name, enabled, metadata)
    res.json({ success: true, data: flag })
  }) as RequestHandler,

  delete: asyncHandler(async (req, res) => {
    const { planId, name } = req.params as Record<string, string>
    await featureFlagService.deleteFlag(planId, name)
    res.json({ success: true })
  }) as RequestHandler,

  checkFeature: asyncHandler(async (req, res) => {
    const institutionId = req.user?.institutionId
    const { feature } = req.params as Record<string, string>
    const enabled = institutionId
      ? await featureFlagService.isFeatureEnabled(institutionId, feature)
      : false
    res.json({ success: true, data: { enabled } })
  }) as RequestHandler,
}
