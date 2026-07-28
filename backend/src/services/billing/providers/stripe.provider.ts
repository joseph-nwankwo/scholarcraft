import Stripe from 'stripe'
import { env } from '../../../config/env'
import { logger } from '../../../utils/logger'
import type { IPaymentProvider, CheckoutOptions, CheckoutSession, WebhookEvent, PaymentStatus } from './types'

export class StripeProvider implements IPaymentProvider {
  readonly name = 'stripe'

  private get client(): Stripe {
    if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
    return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2026-06-24.dahlia' })
  }

  async createCheckoutSession(opts: CheckoutOptions): Promise<CheckoutSession> {
    const stripe = this.client
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: opts.currency.toLowerCase(),
          unit_amount: Math.round(opts.amount * 100),
          product_data: { name: 'LectureCraft Subscription', description: `Invoice ${opts.invoiceId}` },
        },
        quantity: 1,
      }],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      customer_email: opts.email,
      metadata: {
        institutionId: opts.institutionId,
        invoiceId: opts.invoiceId,
        provider: 'stripe',
        ...opts.metadata,
      },
    })

    return { checkoutUrl: session.url!, sessionId: session.id, provider: this.name }
  }

  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    const stripe = this.client
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      logger.warn('Stripe webhook signature verification failed', { err })
      throw new Error('Invalid Stripe webhook signature')
    }

    const raw = event.data.object as Stripe.Checkout.Session
    const status: PaymentStatus = raw.payment_status === 'paid' ? 'succeeded'
      : raw.payment_status === 'unpaid' ? 'failed' : 'pending'

    return {
      provider: this.name,
      eventType: event.type,
      sessionId: raw.id,
      status,
      amountPaid: (raw.amount_total ?? 0) / 100,
      currency: raw.currency?.toUpperCase() ?? 'USD',
      metadata: raw.metadata as Record<string, unknown>,
      raw: event,
    }
  }

  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    const stripe = this.client
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.payment_status === 'paid') return 'succeeded'
    if (session.payment_status === 'unpaid') return 'failed'
    if (session.status === 'expired') return 'cancelled'
    return 'pending'
  }
}
