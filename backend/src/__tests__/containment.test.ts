/**
 * AS-P0-SECURITY-006A — Product billing containment and entitlement bypass closure.
 *
 * Covers: central entitlement client (fail-closed), login / registration /
 * refresh gated on central entitlement, refresh expiry capped at paid-through,
 * direct-signup default, product billing write routes and service guards,
 * webhook no longer granting status, and legacy records never proving access.
 *
 * The product-constants block below is the only part that differs from the
 * other product's copy of this file.
 */

// ── Product constants ─────────────────────────────────────────────────────────
const PRODUCT      = 'scholarsuite'
const DEFAULT_ROLE = 'STUDENT'

// ── Environment (before any module that reads env.ts is loaded) ──────────────
const CENTRAL_URL    = 'http://portal.test/api/internal/entitlements/verify'
const CENTRAL_SECRET = 'test-central-entitlement-service-secret-0123'
const JWT_ACCESS_SECRET = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.DATABASE_URL                       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET                  = JWT_ACCESS_SECRET
process.env.JWT_REFRESH_SECRET                 = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET                = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = CENTRAL_URL
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = CENTRAL_SECRET
delete process.env.DISABLE_DIRECT_SIGNUP

jest.mock('dotenv', () => ({ config: jest.fn() }))

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import express from 'express'
import supertest from 'supertest'
import type { Request, Response, NextFunction } from 'express'

// ── Mocks ─────────────────────────────────────────────────────────────────────
type RT = { id: string; token: string; userId: string; expiresAt: Date; user?: unknown }
const mockState = {
  refreshTokens: [] as RT[],
  users: new Map<string, Record<string, unknown>>(),
}
const mockPrisma = {
  user: {
    findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: string } }) =>
      [...mockState.users.values()].find((u) => (where.email ? u.email === where.email : u.id === where.id)) ?? null),
    update: jest.fn(async () => ({})),
    create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const u = { id: 'new-user', failedAttempts: 0, lockedUntil: null, ...data }
      mockState.users.set('new-user', u)
      return u
    }),
  },
  userProductRole: { upsert: jest.fn(async () => ({ role: DEFAULT_ROLE })) },
  refreshToken: {
    create: jest.fn(async ({ data }: { data: RT }) => { mockState.refreshTokens.push({ id: `rt${mockState.refreshTokens.length}`, ...data }); return data }),
    findUnique: jest.fn(async ({ where }: { where: { token: string } }) => {
      const t = mockState.refreshTokens.find((r) => r.token === where.token)
      return t ? { ...t, user: mockState.users.get(t.userId) } : null
    }),
    delete: jest.fn(async ({ where }: { where: { id: string } }) => {
      mockState.refreshTokens = mockState.refreshTokens.filter((r) => r.id !== where.id)
      return {}
    }),
  },
  loginSession: { create: jest.fn(async () => ({})) },
  institution: { findUnique: jest.fn(async () => null), update: jest.fn() },
  institutionSubscription: {
    findUnique: jest.fn(async () => ({ id: 'legacy-sub', institutionId: 'inst-1', status: 'ACTIVE', planId: 'p', currentPeriodEnd: new Date(Date.now() + 9e9) })),
    findFirst:  jest.fn(async () => ({ id: 'legacy-sub', status: 'PAST_DUE' })),
    findMany:   jest.fn(async () => []),
    create:     jest.fn(),
    update:     jest.fn(),
    count:      jest.fn(),
  },
  subscriptionPlan: { findUnique: jest.fn(async () => ({ id: 'p', price: 100, billingCycle: 'MONTHLY', slug: 'enterprise', currency: 'USD' })) },
  coupon: { findFirst: jest.fn(), update: jest.fn() },
  couponRedemption: { create: jest.fn() },
  invoice: { findUnique: jest.fn(async () => ({ id: 'inv-1', institutionId: 'inst-1', status: 'OPEN' })) },
  payment: { create: jest.fn(async () => ({ id: 'pay-1' })) },
}
jest.mock('../config/database', () => ({ prisma: mockPrisma }))
jest.mock('../config/redis', () => ({ redis: { set: jest.fn() } }))
jest.mock('../services/role/role.service', () => ({
  roleService: { getPrimaryRoleSlug: jest.fn(async () => 'lecturer'), seedPermissions: jest.fn(), createDefaultRoles: jest.fn(), assignRole: jest.fn() },
}))
jest.mock('../services/email/email.service', () => ({ emailService: { sendVerification: jest.fn(), sendWelcome: jest.fn(), sendPasswordReset: jest.fn() } }))
jest.mock('../services/audit/audit.service', () => ({ auditService: { log: jest.fn() } }))
jest.mock('../services/billing/invoice.service', () => ({ invoiceService: { markPaid: jest.fn(), generateInvoice: jest.fn() } }))
const mockVerifyWebhook = jest.fn()
jest.mock('../services/billing/providers', () => ({ getPaymentProvider: () => ({ verifyWebhook: mockVerifyWebhook, createCheckoutSession: jest.fn() }) }))

/* eslint-disable @typescript-eslint/no-require-imports */
const { verifyCentralEntitlement, requireCentralEntitlement } = require('../services/auth/central-entitlement') as typeof import('../services/auth/central-entitlement')
const { authService } = require('../services/auth/auth.service') as typeof import('../services/auth/auth.service')
const { rotateRefreshToken } = require('../services/auth/jwt.service') as typeof import('../services/auth/jwt.service')
const { subscriptionService } = require('../services/billing/subscription.service') as typeof import('../services/billing/subscription.service')
const { paymentService } = require('../services/billing/payment.service') as typeof import('../services/billing/payment.service')
const { requireActiveSubscription } = require('../middleware/billing/usage-limit.middleware') as typeof import('../middleware/billing/usage-limit.middleware')
const { envSchema } = require('../config/env') as typeof import('../config/env')
const { errorHandler } = require('../middleware/errorHandler') as { errorHandler: (e: unknown, q: Request, s: Response, n: NextFunction) => void }
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Central portal stub ───────────────────────────────────────────────────────
const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch
const DAY = 864e5
type Decision = { decision: 'GRANTED' | 'DENIED'; status: string; paidThrough?: string | null; product?: string; reason?: string | null }
function central(d: Decision, httpStatus = 200) {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({
    v: 1, product: d.product ?? PRODUCT, decision: d.decision, status: d.status,
    reason: d.reason ?? (d.decision === 'DENIED' ? 'x' : null), paidThrough: d.paidThrough ?? null, decidedAt: new Date().toISOString(),
  }), { status: httpStatus, headers: { 'content-type': 'application/json' } }))
}
const granted = (days = 30) => central({ decision: 'GRANTED', status: 'ACTIVE', paidThrough: new Date(Date.now() + days * DAY).toISOString() })
const denied  = (status = 'NONE') => central({ decision: 'DENIED', status })

const PASSWORD = 'Correct-Horse-Battery-9!'
const HASH = bcrypt.hashSync(PASSWORD, 4)
function seedUser(over: Record<string, unknown> = {}) {
  mockState.users.set('u1', { id: 'u1', email: 'member@uni.edu', password: HASH, name: 'M', role: DEFAULT_ROLE, status: 'ACTIVE', failedAttempts: 0, lockedUntil: null, institutionId: 'inst-1', ...over })
}
async function codeOf(p: Promise<unknown>) {
  try { await p; return 'resolved' } catch (e) { const x = e as { statusCode?: number; code?: string }; return `${x.statusCode}:${x.code}` }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockState.refreshTokens = []
  mockState.users = new Map()
  fetchMock.mockReset()
  seedUser()
})

// ═════════════════════════════════════════════════════════════════════════════
describe('central entitlement client — contract and fail-closed behaviour', () => {
  it('GRANTED/ACTIVE with a future paid-through → ok; request carries the credential only in the Authorization header', async () => {
    granted(10)
    const r = await verifyCentralEntitlement(PRODUCT, 'member@uni.edu')
    expect(r.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(CENTRAL_URL)
    expect(url).not.toContain(CENTRAL_SECRET)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).authorization).toBe(`Bearer ${CENTRAL_SECRET}`)
    expect(init.redirect).toBe('error')
    expect(JSON.parse(String(init.body))).toEqual({ product: PRODUCT, subject: { email: 'member@uni.edu' } })
  })

  it.each([
    ['NONE (explicit denial)', 'NONE', 'denied'],
    ['DENIED', 'DENIED', 'denied'],
    ['EXPIRED', 'EXPIRED', 'expired'],
    ['SUSPENDED', 'SUSPENDED', 'suspended'],
    ['REVOKED', 'REVOKED', 'revoked'],
  ])('DENIED/%s → %s', async (_l, status, reason) => {
    denied(status)
    expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason })
  })

  it('GRANTED but paid-through already passed → expired (never trusted)', async () => {
    central({ decision: 'GRANTED', status: 'ACTIVE', paidThrough: new Date(Date.now() - 1000).toISOString() })
    expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason: 'expired' })
  })

  it.each([
    ['GRANTED without paid-through', { decision: 'GRANTED' as const, status: 'ACTIVE', paidThrough: null }],
    ['GRANTED with a non-ACTIVE status', { decision: 'GRANTED' as const, status: 'SUSPENDED', paidThrough: new Date(Date.now() + DAY).toISOString() }],
    ['a decision for a different product', { decision: 'GRANTED' as const, status: 'ACTIVE', paidThrough: new Date(Date.now() + DAY).toISOString(), product: 'otherproduct' }],
  ])('%s → malformed', async (_l, d) => {
    central(d)
    expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason: 'malformed' })
  })

  it.each([['not JSON', 'oops'], ['wrong shape', JSON.stringify({ granted: true })]])('a %s body → malformed', async (_l, body) => {
    fetchMock.mockResolvedValue(new Response(body, { status: 200 }))
    expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason: 'malformed' })
  })

  it.each([[401, 'misconfigured'], [400, 'misconfigured'], [500, 'unavailable'], [503, 'unavailable'], [429, 'unavailable']])(
    'HTTP %i from the portal → %s',
    async (status, reason) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'x' }), { status }))
      expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason })
    },
  )

  it.each([['network error', new TypeError('fetch failed')], ['timeout', Object.assign(new Error('t'), { name: 'TimeoutError' })]])(
    'a %s → unavailable',
    async (_l, err) => {
      fetchMock.mockRejectedValue(err)
      expect(await verifyCentralEntitlement(PRODUCT, 'a@b.c')).toEqual({ ok: false, reason: 'unavailable' })
    },
  )

  it('requireCentralEntitlement maps denials to 403 and missing decisions to 503, with no billing details', async () => {
    denied('NONE');      expect(await codeOf(requireCentralEntitlement(PRODUCT, 'a@b.c'))).toBe('403:ENTITLEMENT_REQUIRED')
    denied('EXPIRED');   expect(await codeOf(requireCentralEntitlement(PRODUCT, 'a@b.c'))).toBe('403:ENTITLEMENT_EXPIRED')
    denied('SUSPENDED'); expect(await codeOf(requireCentralEntitlement(PRODUCT, 'a@b.c'))).toBe('403:ENTITLEMENT_SUSPENDED')
    denied('REVOKED');   expect(await codeOf(requireCentralEntitlement(PRODUCT, 'a@b.c'))).toBe('403:ENTITLEMENT_REVOKED')
    fetchMock.mockRejectedValue(new TypeError('down'))
    expect(await codeOf(requireCentralEntitlement(PRODUCT, 'a@b.c'))).toBe('503:ENTITLEMENT_UNAVAILABLE')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('login — central entitlement required before any session', () => {
  const login = () => authService.login({ email: 'member@uni.edu', password: PASSWORD })

  it('valid credentials WITHOUT central entitlement get no tokens (403)', async () => {
    denied('NONE')
    expect(await codeOf(login())).toBe('403:ENTITLEMENT_REQUIRED')
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
    expect(mockPrisma.userProductRole.upsert).not.toHaveBeenCalled()
  })

  it('valid credentials WITH central entitlement receive tokens', async () => {
    granted(30)
    const r = await login()
    expect(r.tokens.accessToken).toEqual(expect.any(String))
    expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1)
  })

  it.each([['EXPIRED', '403:ENTITLEMENT_EXPIRED'], ['SUSPENDED', '403:ENTITLEMENT_SUSPENDED'], ['REVOKED', '403:ENTITLEMENT_REVOKED']])(
    '%s entitlement is denied',
    async (status, code) => {
      denied(status)
      expect(await codeOf(login())).toBe(code)
      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
    },
  )

  it('a central outage does not grant access (503, no tokens)', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    expect(await codeOf(login())).toBe('503:ENTITLEMENT_UNAVAILABLE')
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
  })

  it('invalid service authentication does not grant access (503, no tokens)', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }))
    expect(await codeOf(login())).toBe('503:ENTITLEMENT_UNAVAILABLE')
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
  })

  it('a legacy ACTIVE institution subscription does not substitute for central entitlement', async () => {
    denied('NONE')
    expect(await codeOf(login())).toBe('403:ENTITLEMENT_REQUIRED')
    expect(mockPrisma.institutionSubscription.findUnique).not.toHaveBeenCalled()
  })

  it('normal checks still run first: a wrong password is 401 and the portal is not consulted', async () => {
    granted()
    expect(await codeOf(authService.login({ email: 'member@uni.edu', password: 'wrong' }))).toBe('401:UNAUTHORIZED')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('a suspended account is refused without consulting the portal', async () => {
    seedUser({ status: 'SUSPENDED' })
    granted()
    expect(await codeOf(login())).toBe('403:FORBIDDEN')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the refresh token issued at login never outlives the paid-through date', async () => {
    granted(2)
    await login()
    const created = mockPrisma.refreshToken.create.mock.calls[0][0].data as RT
    expect(created.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 2 * DAY + 1000)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('refresh rotation — re-verified every time', () => {
  function seedRefresh(token = 'rt-old', days = 7) {
    mockState.refreshTokens.push({ id: 'rt-old-id', token, userId: 'u1', expiresAt: new Date(Date.now() + days * DAY) })
  }

  it('valid refresh token + valid central entitlement rotates (old token removed, new one issued)', async () => {
    seedRefresh(); granted(30)
    const r = await rotateRefreshToken('rt-old')
    expect(r.accessToken).toEqual(expect.any(String))
    expect(mockState.refreshTokens.map((t) => t.token)).toEqual([r.refreshToken])
  })

  it.each([['EXPIRED', '403:ENTITLEMENT_EXPIRED'], ['REVOKED', '403:ENTITLEMENT_REVOKED'], ['SUSPENDED', '403:ENTITLEMENT_SUSPENDED'], ['NONE', '403:ENTITLEMENT_REQUIRED']])(
    '%s entitlement cannot rotate, and the session is ended',
    async (status, code) => {
      seedRefresh(); denied(status)
      expect(await codeOf(rotateRefreshToken('rt-old'))).toBe(code)
      expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
      expect(mockState.refreshTokens).toHaveLength(0)
      // the same token can never be tried again
      granted()
      await expect(rotateRefreshToken('rt-old')).rejects.toThrow(/Invalid or expired refresh token/)
    },
  )

  it('a central outage cannot produce a new token (503); the old token is kept for a later retry', async () => {
    seedRefresh(); fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    expect(await codeOf(rotateRefreshToken('rt-old'))).toBe('503:ENTITLEMENT_UNAVAILABLE')
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
    expect(mockState.refreshTokens).toHaveLength(1)
  })

  it('invalid service authentication cannot produce a new token', async () => {
    seedRefresh(); fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))
    expect(await codeOf(rotateRefreshToken('rt-old'))).toBe('503:ENTITLEMENT_UNAVAILABLE')
    expect(mockPrisma.refreshToken.create).not.toHaveBeenCalled()
  })

  it('refresh activity does not extend access: the new token expires at the paid-through date, not 7 days out', async () => {
    seedRefresh(); granted(2)
    await rotateRefreshToken('rt-old')
    const created = mockPrisma.refreshToken.create.mock.calls[0][0].data as RT
    expect(created.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 2 * DAY + 1000)
  })

  it('a suspended account cannot rotate, and the portal is not consulted', async () => {
    seedUser({ status: 'SUSPENDED' }); seedRefresh(); granted()
    expect(await codeOf(rotateRefreshToken('rt-old'))).toBe('403:FORBIDDEN')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockState.refreshTokens).toHaveLength(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('direct signup — disabled by default, backend-enforced', () => {
  const base = {
    DATABASE_URL: 'postgresql://x', JWT_ACCESS_SECRET: 'a'.repeat(40), JWT_REFRESH_SECRET: 'b'.repeat(40),
    CRAFT_LAUNCH_SECRET: 'c'.repeat(40), COOKIE_SECRET: 'd'.repeat(40),
    CENTRAL_ENTITLEMENT_URL: CENTRAL_URL, CENTRAL_ENTITLEMENT_SERVICE_SECRET: 'e'.repeat(40),
  }
  const parse = (extra: Record<string, string> = {}) => envSchema.safeParse({ ...base, ...extra })

  it('missing DISABLE_DIRECT_SIGNUP ⇒ signup disabled', () => {
    const r = parse(); expect(r.success && r.data.DISABLE_DIRECT_SIGNUP).toBe(true)
  })
  it("'true' ⇒ disabled; 'false' ⇒ enabled", () => {
    const t = parse({ DISABLE_DIRECT_SIGNUP: 'true' }); expect(t.success && t.data.DISABLE_DIRECT_SIGNUP).toBe(true)
    const f = parse({ DISABLE_DIRECT_SIGNUP: 'false' }); expect(f.success && f.data.DISABLE_DIRECT_SIGNUP).toBe(false)
  })
  it.each(['1', '0', 'yes', 'False', 'TRUE', ''])('rejects ambiguous value %p at startup', (v) => {
    expect(parse({ DISABLE_DIRECT_SIGNUP: v }).success).toBe(false)
  })

  function appWithSignup(value: string | undefined) {
    if (value === undefined) delete process.env.DISABLE_DIRECT_SIGNUP
    else process.env.DISABLE_DIRECT_SIGNUP = value
    let app!: express.Express
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const authRoutes = require('../routes/auth.routes').default
      const { errorHandler: eh } = require('../middleware/errorHandler')
      /* eslint-enable @typescript-eslint/no-require-imports */
      app = express(); app.use(express.json()); app.use('/api/auth', authRoutes); app.use(eh)
    })
    delete process.env.DISABLE_DIRECT_SIGNUP
    return app
  }
  const body = { name: 'New Person', email: 'new@uni.edu', password: 'Str0ng!Passw0rd#2026' }

  it.each([['unset', undefined], ["'true'", 'true']])('with the flag %s, /register and /register-institution are refused (403) before any account is created', async (_l, value) => {
    const app = appWithSignup(value)
    for (const path of ['/api/auth/register', '/api/auth/register-institution']) {
      const res = await supertest(app).post(path).send(body)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('DIRECT_SIGNUP_DISABLED')
      expect(res.body.message).toMatch(/managed through the UAMSA Tech portal/)
    }
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("with the flag explicitly 'false', registration still cannot create an un-entitled account", async () => {
    const app = appWithSignup('false')
    denied('NONE')
    const res = await supertest(app).post('/api/auth/register').send(body)
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ENTITLEMENT_REQUIRED')
    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("with the flag 'false' and central entitlement, registration proceeds", async () => {
    granted()
    const r = await authService.register({ name: 'New Person', email: 'new@uni.edu', password: 'Str0ng!Passw0rd#2026' })
    expect(r.tokens.refreshToken).toEqual(expect.any(String))
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('product billing write routes — contained', () => {
  function billingApp() {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const billingRoutes = require('../routes/billing.routes').default
    const app = express(); app.use(express.json()); app.use('/api/billing', billingRoutes); app.use(errorHandler)
    return app
  }
  const token = (role: string) => jwt.sign({ userId: 'u1', email: 'member@uni.edu', role, institutionId: 'inst-1', roleSlug: role.toLowerCase() }, JWT_ACCESS_SECRET, { expiresIn: '5m' })
  const WRITES: [string, string, Record<string, unknown>][] = [
    ['post',  '/api/billing/subscription',         { planId: 'p', trialDays: 100000 }],
    ['patch', '/api/billing/subscription/upgrade', { planId: 'enterprise', prorate: false }],
    ['patch', '/api/billing/subscription/cancel',  { immediate: true }],
    ['patch', '/api/billing/subscription/resume',  {}],
    ['post',  '/api/billing/payments/initiate',    { invoiceId: 'inv-1' }],
  ]

  it.each(['STUDENT', 'LECTURER', 'ADMIN'])('a %s cannot create, upgrade, cancel, resume or start checkout (410)', async (role) => {
    const app = billingApp()
    for (const [method, path, payload] of WRITES) {
      const res = await (supertest(app) as unknown as Record<string, (p: string) => supertest.Test>)[method](path)
        .set('Authorization', `Bearer ${token(role)}`).send(payload)
      expect(res.status).toBe(410)
      expect(res.body.code).toBe('BILLING_MANAGED_CENTRALLY')
      expect(JSON.stringify(res.body)).not.toMatch(/prisma|stack|secret/i)
    }
    expect(mockPrisma.institutionSubscription.create).not.toHaveBeenCalled()
    expect(mockPrisma.institutionSubscription.update).not.toHaveBeenCalled()
    expect(mockPrisma.institution.update).not.toHaveBeenCalled()
  })

  it('unauthenticated write attempts are still 401', async () => {
    expect((await supertest(billingApp()).post('/api/billing/subscription').send({})).status).toBe(401)
  })

  it('read-only subscription history remains available', async () => {
    const res = await supertest(billingApp()).get('/api/billing/subscription').set('Authorization', `Bearer ${token('STUDENT')}`)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: 'legacy-sub' })
  })

  it.each([
    ['createSubscription with an arbitrary trialDays', () => subscriptionService.createSubscription('inst-1', 'p', { trialDays: 100000 })],
    ['upgradeSubscription', () => subscriptionService.upgradeSubscription('inst-1', 'p')],
    ['cancelSubscription', () => subscriptionService.cancelSubscription('inst-1', true)],
    ['resumeSubscription', () => subscriptionService.resumeSubscription('inst-1')],
    ['renewSubscription', () => subscriptionService.renewSubscription('inst-1')],
    ['processExpiredTrials', () => subscriptionService.processExpiredTrials()],
    ['paymentService.initiatePayment', () => paymentService.initiatePayment({ institutionId: 'inst-1', invoiceId: 'inv-1', successUrl: 'x', cancelUrl: 'y' })],
  ])('service guard: %s is refused (410) without touching any record', async (_l, fn) => {
    expect(await codeOf(fn())).toBe('410:BILLING_MANAGED_CENTRALLY')
    for (const m of Object.values(mockPrisma.institutionSubscription)) expect(m).not.toHaveBeenCalled()
    expect(mockPrisma.subscriptionPlan.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.invoice.findUnique).not.toHaveBeenCalled()
  })

  it('a legacy provider webhook still records payment history but no longer marks the subscription ACTIVE', async () => {
    mockVerifyWebhook.mockResolvedValue({ metadata: { invoiceId: 'inv-1' }, amountPaid: 100, currency: 'USD', status: 'succeeded', sessionId: 'ref-1' })
    await paymentService.handleWebhook('paystack', '{}', 'sig')
    expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.institutionSubscription.update).not.toHaveBeenCalled()
    expect(mockPrisma.institutionSubscription.findFirst).not.toHaveBeenCalled()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
describe('requireActiveSubscription — legacy records are not proof of access', () => {
  async function run(user: Record<string, unknown> | undefined) {
    const next = jest.fn()
    await requireActiveSubscription()({ user } as unknown as Request, {} as Response, next)
    return next.mock.calls[0]?.[0] as { statusCode?: number; code?: string } | undefined
  }

  it('a legacy ACTIVE/TRIALING record with no central entitlement is denied (it used to be allowed)', async () => {
    denied('NONE')
    expect((await run({ email: 'member@uni.edu', institutionId: 'inst-1' }))?.code).toBe('ENTITLEMENT_REQUIRED')
    expect(mockPrisma.institutionSubscription.findUnique).not.toHaveBeenCalled()
  })

  it('central entitlement passes', async () => {
    granted()
    expect(await run({ email: 'member@uni.edu', institutionId: 'inst-1' })).toBeUndefined()
  })

  it('a central outage is not a grant', async () => {
    fetchMock.mockRejectedValue(new TypeError('down'))
    expect((await run({ email: 'member@uni.edu' }))?.statusCode).toBe(503)
  })
})
