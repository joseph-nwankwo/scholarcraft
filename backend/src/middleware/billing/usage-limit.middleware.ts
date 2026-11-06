import type { RequestHandler } from 'express'
import { usageService } from '../../services/billing/usage.service'
import { AppError } from '../../utils/errors'
import type { UsageMetricType } from '@prisma/client'
import { requireCentralEntitlement } from '../../services/auth/central-entitlement'
import { PRODUCT_ID } from '../../config/product'

// AS-P0-SECURITY-006A: requireUsageCapacity and requireFeature read LEGACY
// product-side plan data (institution_subscriptions / feature_flags). They are
// plan-limit helpers, NOT commercial entitlement, and must not be attached as
// an access gate. Commercial entitlement is enforced centrally at login,
// registration and every refresh (services/auth/central-entitlement.ts).

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

/**
 * AS-P0-SECURITY-006A: delegates to the central portal. It previously ALLOWED
 * access when the legacy record was missing, TRIALING or PAST_DUE — legacy
 * records are not proof of entitlement. Each call is one central round-trip,
 * so prefer the session-level gates; attach this only where a per-request
 * check is genuinely needed.
 */
export function requireActiveSubscription(): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.user?.email) return next(AppError.unauthorized())
      await requireCentralEntitlement(PRODUCT_ID, req.user.email)
      next()
    } catch (err) {
      next(err)
    }
  }
}
