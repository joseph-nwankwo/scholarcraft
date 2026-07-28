import { env } from '../../../config/env'
import { StripeProvider } from './stripe.provider'
import { PaystackProvider } from './paystack.provider'
import { FlutterwaveProvider } from './flutterwave.provider'
import type { IPaymentProvider } from './types'

type ProviderType = 'stripe' | 'paystack' | 'flutterwave'

const registry: Record<ProviderType, IPaymentProvider> = {
  stripe: new StripeProvider(),
  paystack: new PaystackProvider(),
  flutterwave: new FlutterwaveProvider(),
}

export function getPaymentProvider(name?: string): IPaymentProvider {
  const key = (name ?? env.BILLING_DEFAULT_PROVIDER ?? 'stripe').toLowerCase() as ProviderType
  const provider = registry[key]
  if (!provider) throw new Error(`Unknown payment provider: ${key}`)
  return provider
}

export type { IPaymentProvider, CheckoutOptions, CheckoutSession, WebhookEvent, PaymentStatus } from './types'
