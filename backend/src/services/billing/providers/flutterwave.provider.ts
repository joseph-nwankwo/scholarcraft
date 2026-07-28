import axios from 'axios'
import crypto from 'crypto'
import { env } from '../../../config/env'
import { logger } from '../../../utils/logger'
import type { IPaymentProvider, CheckoutOptions, CheckoutSession, WebhookEvent, PaymentStatus } from './types'

const BASE = 'https://api.flutterwave.com/v3'

function headers() {
  if (!env.FLUTTERWAVE_SECRET_KEY) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')
  return { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' }
}

export class FlutterwaveProvider implements IPaymentProvider {
  readonly name = 'flutterwave'

  async createCheckoutSession(opts: CheckoutOptions): Promise<CheckoutSession> {
    const txRef = `lc-${opts.invoiceId}-${Date.now()}`

    const res = await axios.post<{ status: string; data: { link: string } }>(
      `${BASE}/payments`,
      {
        tx_ref: txRef,
        amount: opts.amount,
        currency: opts.currency.toUpperCase(),
        redirect_url: opts.successUrl,
        customer: { email: opts.email },
        meta: { institutionId: opts.institutionId, invoiceId: opts.invoiceId, provider: 'flutterwave', ...opts.metadata },
        customizations: { title: 'LectureCraft', description: `Invoice ${opts.invoiceId}` },
      },
      { headers: headers() },
    )

    if (res.data.status !== 'success') throw new Error('Flutterwave payment link creation failed')

    return { checkoutUrl: res.data.data.link, sessionId: txRef, provider: this.name }
  }

  async verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent> {
    const secret = env.FLUTTERWAVE_SECRET_KEY
    if (!secret) throw new Error('FLUTTERWAVE_SECRET_KEY not configured')

    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    if (hash !== signature) {
      logger.warn('Flutterwave webhook signature mismatch')
      throw new Error('Invalid Flutterwave webhook signature')
    }

    const body = typeof payload === 'string' ? JSON.parse(payload) : JSON.parse(payload.toString())
    const data = body.data ?? {}
    const status: PaymentStatus = data.status === 'successful' ? 'succeeded'
      : data.status === 'failed' ? 'failed' : 'pending'

    return {
      provider: this.name,
      eventType: body.event,
      sessionId: data.tx_ref ?? '',
      status,
      amountPaid: data.amount ?? 0,
      currency: data.currency ?? 'USD',
      metadata: data.meta ?? {},
      raw: body,
    }
  }

  async getPaymentStatus(txRef: string): Promise<PaymentStatus> {
    const res = await axios.get<{ status: string; data: { data: Array<{ status: string }> } }>(
      `${BASE}/transactions?tx_ref=${txRef}`,
      { headers: headers() },
    )
    const tx = res.data.data?.data?.[0]
    if (!tx) return 'pending'
    if (tx.status === 'successful') return 'succeeded'
    if (tx.status === 'failed') return 'failed'
    return 'pending'
  }
}
