import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { getPaymentProvider } from './providers'
import { invoiceService } from './invoice.service'
import type { CheckoutOptions } from './providers/types'
import type { PaymentProviderType } from '@prisma/client'
import { assertProductBillingWritesDisabled } from './central-billing'

export const paymentService = {
  async initiatePayment(opts: {
    institutionId: string
    invoiceId: string
    providerName?: string
    successUrl: string
    cancelUrl: string
  }) {
    // AS-P0-SECURITY-006A: checkout is central-only.
    assertProductBillingWritesDisabled()
    const invoice = await prisma.invoice.findUnique({
      where: { id: opts.invoiceId },
      include: { institution: true },
    })
    if (!invoice) throw AppError.notFound('Invoice')
    if (invoice.status === 'PAID') throw AppError.badRequest('Invoice is already paid')
    if (invoice.status === 'VOID') throw AppError.badRequest('Invoice is voided')
    if (invoice.institutionId !== opts.institutionId) throw AppError.forbidden()

    const provider = getPaymentProvider(opts.providerName)
    const email = invoice.institution.contactEmail ?? ''

    const checkoutOpts: CheckoutOptions = {
      institutionId: opts.institutionId,
      invoiceId: opts.invoiceId,
      amount: Number(invoice.total),
      currency: invoice.currency,
      email,
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
    }

    const session = await provider.createCheckoutSession(checkoutOpts)

    return session
  },

  async handleWebhook(providerName: string, payload: string | Buffer, signature: string) {
    const provider = getPaymentProvider(providerName)
    const event = await provider.verifyWebhook(payload, signature)

    const invoiceId = (event.metadata as Record<string, string>).invoiceId
    if (!invoiceId) return { ignored: true, reason: 'no invoiceId in metadata' }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } })
    if (!invoice) return { ignored: true, reason: 'invoice not found' }

    const providerType = providerName.toUpperCase() as PaymentProviderType

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        institutionId: invoice.institutionId,
        amount: event.amountPaid,
        currency: event.currency,
        status: event.status === 'succeeded' ? 'SUCCEEDED'
          : event.status === 'failed' ? 'FAILED' : 'PENDING',
        paymentProvider: providerType,
        transactionReference: event.sessionId,
        providerMetadata: JSON.parse(JSON.stringify(event.metadata)),
        paidAt: event.status === 'succeeded' ? new Date() : null,
      },
    })

    if (event.status === 'succeeded' && invoice.status !== 'PAID') {
      // Payment/invoice HISTORY is still recorded for legacy deliveries.
      await invoiceService.markPaid(invoiceId, payment.id)
      // AS-P0-SECURITY-006A: a product webhook no longer changes subscription
      // status (it used to flip PAST_DUE → ACTIVE). Entitlement is central.
    }

    return { payment, event }
  },

  async getPayments(institutionId: string, opts?: { page?: number; limit?: number; status?: string }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where: { institutionId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { invoice: { select: { invoiceNumber: true } } },
      }),
      prisma.payment.count({ where: { institutionId } }),
    ])

    return { items: items.map(sanitize), total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getAllPayments(opts?: { page?: number; limit?: number; status?: string }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit
    const where = opts?.status ? { status: opts.status as import('@prisma/client').PaymentStatus } : {}

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { institution: { select: { id: true, name: true } }, invoice: { select: { invoiceNumber: true } } },
      }),
      prisma.payment.count({ where }),
    ])

    return { items: items.map(sanitize), total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getPaymentStatus(sessionId: string, providerName: string) {
    const provider = getPaymentProvider(providerName)
    return provider.getPaymentStatus(sessionId)
  },
}

function sanitize(payment: { providerMetadata: unknown; [key: string]: unknown }) {
  const { providerMetadata: _, ...safe } = payment
  return safe
}
