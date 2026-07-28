import type { RequestHandler } from 'express'
import { usageService } from '../../services/billing/usage.service'
import { AppError } from '../../utils/errors'
import type { UsageMetricType } from '@prisma/client'

export function requireUsageCapacity(metric: UsageMetricType, amount = 1): RequestHandler {
  return async (req, _res, next) => {
    try {
      const { institutionId } = req.user!
      if (!institutionId) return next()
      await usageService.checkLimit(institutionId, metric, amount)
      next()
    } catch (err) {
      next(err)
    }
  }
}

export function requireFeature(featureName: string): RequestHandler {
  return async (req, _res, next) => {
    try {
      const { institutionId } = req.user!
      if (!institutionId) return next()

      const { featureFlagService } = await import('../../services/billing/feature-flag.service')
      const enabled = await featureFlagService.isFeatureEnabled(institutionId, featureName)
      if (!enabled) {
        return next(AppError.forbidden(`Feature '${featureName}' is not available on your current plan`))
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

export function requireActiveSubscription(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const { institutionId } = req.user!
      if (!institutionId) return next()

      const { prisma } = await import('../../config/database')
      const sub = await prisma.institutionSubscription.findUnique({ where: { institutionId } })

      if (sub && (sub.status === 'CANCELLED' || sub.status === 'EXPIRED')) {
        return next(AppError.forbidden('Your subscription is not active. Please renew to continue.'))
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}
