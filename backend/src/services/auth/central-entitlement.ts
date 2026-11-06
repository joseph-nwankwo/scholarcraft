import { z } from 'zod'
import { env } from '../../config/env'
import { AppError } from '../../utils/errors'
import { logger } from '../../utils/logger'

/**
 * Central entitlement verification (AS-P0-SECURITY-006A).
 *
 * The UAMSA Tech portal is the only commercial authority. Before this product
 * issues or renews a session, it asks the portal — server-to-server, with this
 * product's own service credential — whether the user is entitled to THIS
 * product right now. Possession of a product account, and any legacy
 * product-side billing record, are never proof of entitlement.
 *
 * Fails closed: anything other than a well-formed, product-matching, unexpired
 * GRANTED decision is a denial. There is no cache, so a revocation or expiry
 * takes effect at the next login or refresh.
 */

export type CentralDenial =
  | 'denied'          // portal says not entitled (no subscription, trial, past due, canceled…)
  | 'expired'         // portal says the paid-through date has passed
  | 'suspended'       // reserved: dispute lifecycle (AS-P0-SECURITY-008)
  | 'revoked'         // reserved: refund / lost dispute (AS-P0-SECURITY-008)
  | 'unavailable'     // network error, timeout, 5xx, 429
  | 'misconfigured'   // portal rejected our credential or request (400/401)
  | 'malformed'       // response did not match the contract

export type CentralEntitlementResult =
  | { ok: true; paidThrough: Date }
  | { ok: false; reason: CentralDenial }

const decisionSchema = z.object({
  v:           z.literal(1),
  product:     z.string(),
  decision:    z.enum(['GRANTED', 'DENIED']),
  status:      z.enum(['ACTIVE', 'NONE', 'EXPIRED', 'DENIED', 'SUSPENDED', 'REVOKED']),
  reason:      z.string().nullable(),
  paidThrough: z.string().nullable(),
  decidedAt:   z.string(),
})

export async function verifyCentralEntitlement(
  product: string,
  email: string,
  now: Date = new Date(),
): Promise<CentralEntitlementResult> {
  let res: Response
  try {
    res = await fetch(env.CENTRAL_ENTITLEMENT_URL, {
      method:   'POST',
      headers:  {
        'authorization': `Bearer ${env.CENTRAL_ENTITLEMENT_SERVICE_SECRET}`,
        'content-type':  'application/json',
        'accept':        'application/json',
      },
      body:     JSON.stringify({ product, subject: { email } }),
      redirect: 'error',                                   // never follow a redirect with our credential
      signal:   AbortSignal.timeout(env.CENTRAL_ENTITLEMENT_TIMEOUT_MS),
    })
  } catch (err) {
    logger.warn('entitlement.central_unreachable', { product, error: (err as Error).name })
    return { ok: false, reason: 'unavailable' }
  }

  if (res.status === 400 || res.status === 401) {
    logger.error('entitlement.central_rejected_request', { product, status: res.status })
    return { ok: false, reason: 'misconfigured' }
  }
  if (!res.ok) {
    logger.warn('entitlement.central_error', { product, status: res.status })
    return { ok: false, reason: 'unavailable' }
  }

  let parsed: z.infer<typeof decisionSchema>
  try {
    const result = decisionSchema.safeParse(await res.json())
    if (!result.success) return { ok: false, reason: 'malformed' }
    parsed = result.data
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (parsed.product !== product) return { ok: false, reason: 'malformed' }

  if (parsed.decision === 'GRANTED') {
    if (parsed.status !== 'ACTIVE' || !parsed.paidThrough) return { ok: false, reason: 'malformed' }
    const paidThrough = new Date(parsed.paidThrough)
    if (Number.isNaN(paidThrough.getTime())) return { ok: false, reason: 'malformed' }
    if (paidThrough.getTime() <= now.getTime()) return { ok: false, reason: 'expired' }
    return { ok: true, paidThrough }
  }

  switch (parsed.status) {
    case 'EXPIRED':   return { ok: false, reason: 'expired' }
    case 'SUSPENDED': return { ok: false, reason: 'suspended' }
    case 'REVOKED':   return { ok: false, reason: 'revoked' }
    default:          return { ok: false, reason: 'denied' }
  }
}

const DENIAL_ERRORS: Record<CentralDenial, () => AppError> = {
  denied:        () => new AppError(ENTITLEMENT_MESSAGE, 403, 'ENTITLEMENT_REQUIRED'),
  expired:       () => new AppError(ENTITLEMENT_MESSAGE, 403, 'ENTITLEMENT_EXPIRED'),
  suspended:     () => new AppError(ENTITLEMENT_MESSAGE, 403, 'ENTITLEMENT_SUSPENDED'),
  revoked:       () => new AppError(ENTITLEMENT_MESSAGE, 403, 'ENTITLEMENT_REVOKED'),
  unavailable:   () => new AppError(UNAVAILABLE_MESSAGE, 503, 'ENTITLEMENT_UNAVAILABLE'),
  misconfigured: () => new AppError(UNAVAILABLE_MESSAGE, 503, 'ENTITLEMENT_UNAVAILABLE'),
  malformed:     () => new AppError(UNAVAILABLE_MESSAGE, 503, 'ENTITLEMENT_UNAVAILABLE'),
}

export const ENTITLEMENT_MESSAGE = 'Access to this product is managed through your UAMSA Tech portal account.'
export const UNAVAILABLE_MESSAGE = 'Access could not be verified right now. Please try again shortly.'

/** Returns the paid-through instant, or throws a 403 (no entitlement) / 503 (no decision). */
export async function requireCentralEntitlement(product: string, email: string): Promise<Date> {
  const result = await verifyCentralEntitlement(product, email)
  if (!result.ok) throw DENIAL_ERRORS[result.reason]()
  return result.paidThrough
}
