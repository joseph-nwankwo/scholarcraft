export interface CheckoutOptions {
  institutionId: string
  invoiceId: string
  amount: number        // in major currency units (USD, NGN, etc.)
  currency: string
  email: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export interface CheckoutSession {
  checkoutUrl: string
  sessionId: string
  provider: string
}

export interface WebhookEvent {
  provider: string
  eventType: string
  sessionId: string
  status: 'succeeded' | 'failed' | 'pending' | 'cancelled'
  amountPaid: number
  currency: string
  metadata: Record<string, unknown>
  raw: unknown
}

export type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'cancelled' | 'refunded'

export interface IPaymentProvider {
  name: string
  createCheckoutSession(opts: CheckoutOptions): Promise<CheckoutSession>
  verifyWebhook(payload: string | Buffer, signature: string): Promise<WebhookEvent>
  getPaymentStatus(sessionId: string): Promise<PaymentStatus>
}
