import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { usageService } from '../../services/billing/usage.service'
import { AppError } from '../../utils/errors'
import type { UsageMetricType } from '@prisma/client'

export const usageController = {
  summary: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const summary = await usageService.getUsageSummary(institutionId)
    res.json({ success: true, data: summary })
  }) as RequestHandler,

  history: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { metric, limit } = req.query as Record<string, string>
    const records = await usageService.getUsageHistory(
      institutionId,
      metric as UsageMetricType | undefined,
      limit ? Number(limit) : undefined,
    )
    res.json({ success: true, data: records.map((r) => ({ ...r, value: Number(r.value) })) })
  }) as RequestHandler,

  // Admin: get usage for any institution
  adminSummary: asyncHandler(async (req, res) => {
    const summary = await usageService.getUsageSummary(req.params.institutionId as string)
    res.json({ success: true, data: summary })
  }) as RequestHandler,
}
