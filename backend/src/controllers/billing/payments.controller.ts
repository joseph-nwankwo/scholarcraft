import type { RequestHandler, Request } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { paymentService } from '../../services/billing/payment.service'
import { AppError } from '../../utils/errors'
import { env } from '../../config/env'

export const paymentsController = {
  initiate: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { invoiceId, provider } = req.body
    const origin = req.headers.origin ?? `http://localhost:${env.PORT ?? 3000}`
    const session = await paymentService.initiatePayment({
      institutionId,
      invoiceId,
      providerName: provider,
      successUrl: `${origin}/billing/payment-success?invoice=${invoiceId}`,
      cancelUrl: `${origin}/billing/invoices`,
    })
    res.json({ success: true, data: session })
  }) as RequestHandler,

  status: asyncHandler(async (req, res) => {
    const { sessionId, provider } = req.query as Record<string, string>
    if (!sessionId || !provider) throw AppError.badRequest('sessionId and provider are required')
    const status = await paymentService.getPaymentStatus(sessionId, provider)
    res.json({ success: true, data: { status } })
  }) as RequestHandler,

  listMine: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { page, limit } = req.query as Record<string, string>
    const result = await paymentService.getPayments(institutionId, { page: Number(page), limit: Number(limit) })
    res.json({ success: true, ...result })
  }) as RequestHandler,

  // Admin
  adminList: asyncHandler(async (req, res) => {
    const { page, limit, status } = req.query as Record<string, string>
    const result = await paymentService.getAllPayments({ page: Number(page), limit: Number(limit), status })
    res.json({ success: true, ...result })
  }) as RequestHandler,
}

export const webhookController = {
  stripe: asyncHandler(async (req: Request & { rawBody?: Buffer }, res) => {
    const signature = req.headers['stripe-signature'] as string
    if (!signature) throw AppError.badRequest('Missing stripe-signature header')
    const payload = req.rawBody ?? req.body
    const result = await paymentService.handleWebhook('stripe', payload, signature)
    res.json({ received: true, result })
  }) as RequestHandler,

  paystack: asyncHandler(async (req: Request & { rawBody?: Buffer }, res) => {
    const signature = req.headers['x-paystack-signature'] as string
    if (!signature) throw AppError.badRequest('Missing x-paystack-signature header')
    const payload = req.rawBody ?? req.body
    const result = await paymentService.handleWebhook('paystack', payload, signature)
    res.json({ received: true, result })
  }) as RequestHandler,

  flutterwave: asyncHandler(async (req: Request & { rawBody?: Buffer }, res) => {
    const signature = req.headers['verif-hash'] as string
    if (!signature) throw AppError.badRequest('Missing verif-hash header')
    const payload = req.rawBody ?? req.body
    const result = await paymentService.handleWebhook('flutterwave', payload, signature)
    res.json({ received: true, result })
  }) as RequestHandler,
}
