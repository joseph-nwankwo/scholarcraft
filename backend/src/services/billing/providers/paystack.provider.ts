import axios from 'axios'
import crypto from 'crypto'
import { env } from '../../../config/env'
import { logger } from '../../../utils/logger'
import type { IPaymentProvider, CheckoutOptions, CheckoutSession, WebhookEvent, PaymentStatus } from './types'

const BASE = 'https://api.paystack.co'

function headers() {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY not configured')
  return { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }
}

export class PaystackProvider implements IPaymentProvider {
  readonly name = 'paystack'

  async createCheckoutSession(opts: CheckoutOptions): Promise<CheckoutSession> {
    const res = await axios.post<{ status: boolean; data: { authorization_url: string; reference: string } }>(
      `${BASE}/transaction/initialize`,
      {
        email: opts.email,
        amount: Math.round(opts.amount * 100), // Paystack amount is in kobo (NGN minor unit)
        currency: opts.currency.toUpperCase(),
        callback_url: opts.successUrl,
        metadata: { institutionId: opts.institutionId, invoiceId: opts.invoiceId, provider: 'paystack', ...opts.metadata },
      },
      { headers: headers() },
    )

    if (!res.data.status) throw new Error('Paystack initialization failed')
    const { authorization_url, reference } = res.data.data

    return { checkoutUrl: authorization_url, sessionId: reference, provider: this.name }
  }

  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    if (!env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY not configured')
    const hash = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(payload).digest('hex')

    if (hash !== signature) {
      logger.warn('Paystack webhook signature mismatch')
      throw new Error('Invalid Paystack webhook signature')
    }

    const body = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString())
    const data = body.data ?? {}
    const status: PaymentStatus = data.status === 'success' ? 'succeeded'
      : data.status === 'failed' ? 'failed' : 'pending'

    return {
      provider: this.name,
      eventType: body.event,
      sessionId: data.reference ?? '',
      status,
      amountPaid: (data.amount ?? 0) / 100,
      currency: data.currency ?? 'NGN',
      metadata: data.metadata ?? {},
      raw: body,
    }
  }

  async getPaymentStatus(reference: string): Promise<PaymentStatus> {
    const res = await axios.get<{ status: boolean; data: { status: string } }>(
      `${BASE}/transaction/verify/${reference}`,
      { headers: headers() },
    )
    const status = res.data.data?.status
    if (status === 'success') return 'succeeded'
    if (status === 'failed') return 'failed'
    if (status === 'abandoned') return 'cancelled'
    return 'pending'
  }
}
