import type { RequestHandler } from 'express'
import { AppError } from '../../utils/errors'

/**
 * Product billing containment boundary (AS-P0-SECURITY-006A).
 *
 * The UAMSA Tech portal is the single commercial billing and entitlement
 * authority. This product no longer creates, upgrades, extends, cancels,
 * resumes or renews commercial subscriptions, starts trials, or initiates
 * payments. The legacy tables (institution_subscriptions, invoices, payments,
 * coupons) and their read-only views are preserved untouched.
 *
 * Any future central integration must replace these calls with a portal-issued
 * decision — never re-enable the local write paths.
 */

export const BILLING_MANAGED_CENTRALLY = 'BILLING_MANAGED_CENTRALLY'
export const BILLING_MANAGED_CENTRALLY_MESSAGE =
  'Subscriptions and payments are managed in the UAMSA Tech portal. This action is not available in the product.'

/** 410 Gone: the operation has permanently moved to the central portal. */
export function billingManagedCentrally(): AppError {
  return new AppError(BILLING_MANAGED_CENTRALLY_MESSAGE, 410, BILLING_MANAGED_CENTRALLY)
}

/** Throws unconditionally. Typed `void` (not `never`) so call sites keep their bodies type-checked. */
export function assertProductBillingWritesDisabled(): void {
  throw billingManagedCentrally()
}

/** Route handler for every disabled billing write endpoint. */
export const centralBillingOnly: RequestHandler = (_req, _res, next) => {
  next(billingManagedCentrally())
}
