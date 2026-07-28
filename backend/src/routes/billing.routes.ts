import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { plansController } from '../controllers/billing/plans.controller'
import { subscriptionsController } from '../controllers/billing/subscriptions.controller'
import { invoicesController } from '../controllers/billing/invoices.controller'
import { paymentsController, webhookController } from '../controllers/billing/payments.controller'
import { couponsController } from '../controllers/billing/coupons.controller'
import { usageController } from '../controllers/billing/usage.controller'
import { apikeysController } from '../controllers/billing/apikeys.controller'
import { featureFlagsController } from '../controllers/billing/feature-flags.controller'

const router = Router()

// ─── Public ───────────────────────────────────────────────────────────
// Webhook endpoints MUST come before body-parsing middleware — they need raw body
router.post('/webhooks/stripe', webhookController.stripe)
router.post('/webhooks/paystack', webhookController.paystack)
router.post('/webhooks/flutterwave', webhookController.flutterwave)

// Plans — public (anyone can browse plans)
router.get('/plans', plansController.list)
router.get('/plans/:id', plansController.get)

// Coupon validation — authenticated
router.get('/coupons/validate/:code', authenticate, couponsController.validate)

// Feature flag check — authenticated
router.get('/features/:feature', authenticate, featureFlagsController.checkFeature)

// ─── Institution admin routes ──────────────────────────────────────────
router.use(authenticate)

// Subscriptions (institution admin)
router.get('/subscription', subscriptionsController.myCurrent)
router.post('/subscription', subscriptionsController.create)
router.patch('/subscription/upgrade', subscriptionsController.upgrade)
router.patch('/subscription/cancel', subscriptionsController.cancel)
router.patch('/subscription/resume', subscriptionsController.resume)

// Invoices (institution admin)
router.get('/invoices', invoicesController.list)
router.get('/invoices/:id', invoicesController.get)
router.get('/invoices/:id/download', invoicesController.download)

// Payments (institution admin)
router.post('/payments/initiate', paymentsController.initiate)
router.get('/payments/status', paymentsController.status)
router.get('/payments', paymentsController.listMine)

// Usage (institution admin)
router.get('/usage', usageController.summary)
router.get('/usage/history', usageController.history)

// API Keys (institution admin)
router.get('/api-keys', apikeysController.list)
router.post('/api-keys', apikeysController.generate)
router.delete('/api-keys/:id', apikeysController.revoke)
router.post('/api-keys/:id/rotate', apikeysController.rotate)

// ─── Super-admin routes ────────────────────────────────────────────────
const adminOnly = requireRole('SUPER_ADMIN', 'ADMIN')

router.get('/admin/subscriptions', adminOnly, subscriptionsController.adminList)
router.get('/admin/subscriptions/stats', adminOnly, subscriptionsController.adminStats)
router.get('/admin/subscriptions/:id', adminOnly, subscriptionsController.adminGet)

router.get('/admin/invoices', adminOnly, invoicesController.adminList)
router.patch('/admin/invoices/:id/void', adminOnly, invoicesController.adminVoid)
router.get('/admin/revenue', adminOnly, invoicesController.adminRevenueStats)

router.get('/admin/payments', adminOnly, paymentsController.adminList)

router.get('/admin/coupons', adminOnly, couponsController.list)
router.post('/admin/coupons', adminOnly, couponsController.create)
router.patch('/admin/coupons/:id/revoke', adminOnly, couponsController.revoke)
router.get('/admin/coupons/:id/stats', adminOnly, couponsController.stats)

router.get('/admin/usage/:institutionId', adminOnly, usageController.adminSummary)

router.get('/admin/feature-flags', adminOnly, featureFlagsController.listAll)
router.get('/admin/feature-flags/:planId', adminOnly, featureFlagsController.listForPlan)
router.put('/admin/feature-flags', adminOnly, featureFlagsController.set)
router.delete('/admin/feature-flags/:planId/:name', adminOnly, featureFlagsController.delete)

export default router
