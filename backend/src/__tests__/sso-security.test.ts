/**
 * P0 Security Tests — ScholarSuite (AS-P0-SECURITY-001, corrected in AS-P0-SECURITY-002)
 *
 * Covers:
 *  P0-01 — SSO launch-token verification (CRAFT_LAUNCH_SECRET, claims, lifetime,
 *          replay protection that fails closed, cross-product isolation, and
 *          separation from normal API access tokens)
 *  P0-02 — CSRF middleware signs/verifies with the validated env.COOKIE_SECRET;
 *          tokens forged with the old hardcoded fallbacks are rejected
 *  P0-03 — Product identifier is the canonical one
 *
 * The product-constants block below is the only part that differs from the
 * LectureSuite copy of this file.
 */

import jwt from 'jsonwebtoken'
import { randomUUID, createHmac } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import supertest from 'supertest'
import express from 'express'

// ── Product constants ─────────────────────────────────────────────────────────
const PRODUCT       = 'scholarsuite'
const OTHER_PRODUCT = 'lecturesuite'
const LEGACY_ID     = 'scholarcraft'
const PRODUCT_ROLE  = 'STUDENT' as const
const FRONTEND_URL  = 'http://localhost:3002'

// ── Environment setup (must run before env.ts is imported) ────────────────────
const CRAFT_LAUNCH_SECRET = 'test-craft-launch-secret-min-32-chars-long!'
const JWT_ACCESS_SECRET   = 'test-jwt-access-secret-min-32-chars-long!!'
const COOKIE_SECRET       = 'test-cookie-secret-min-32-chars-long!!!!!!!'

process.env.DATABASE_URL        = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET   = JWT_ACCESS_SECRET
process.env.JWT_REFRESH_SECRET  = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET = CRAFT_LAUNCH_SECRET
process.env.COOKIE_SECRET       = COOKIE_SECRET
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'
process.env.FRONTEND_URL        = FRONTEND_URL

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../config/database', () => ({
  prisma: {
    user:            { findUnique: jest.fn(), create: jest.fn() },
    userProductRole: { upsert: jest.fn() },
    refreshToken:    { create: jest.fn() },
  },
}))

jest.mock('../config/redis', () => ({ redis: { set: jest.fn() } }))

jest.mock('../services/auth/jwt.service', () => ({
  signAccessToken:    jest.fn(),
  createRefreshToken: jest.fn(),
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require('../config/database') as {
  prisma: {
    user:            { findUnique: jest.Mock; create: jest.Mock }
    userProductRole: { upsert: jest.Mock }
  }
}
const { redis } = require('../config/redis') as { redis: { set: jest.Mock } }
const jwtService = require('../services/auth/jwt.service') as { signAccessToken: jest.Mock; createRefreshToken: jest.Mock }
const { authController } = require('../controllers/auth.controller')
const { authenticate }   = require('../middleware/auth.middleware') as { authenticate: (req: Request, res: Response, next: NextFunction) => void }
const security = require('../middleware/security.middleware') as {
  csrfTokenMiddleware: (req: Request, res: Response) => void
  csrfProtection:      (req: Request, res: Response, next: NextFunction) => void
}
/* eslint-enable @typescript-eslint/no-require-imports */

const mockUser = { id: 'user-1', email: 'person@uamsatech.com', institutionId: null }

/** In-memory model of Redis `SET key val EX ttl NX` semantics. */
let redisStore: Set<string>

beforeEach(() => {
  redisStore = new Set()
  redis.set.mockImplementation((key: string, _v: string, _ex: string, _ttl: number, nx: string) => {
    if (nx !== 'NX') return Promise.resolve('OK')
    if (redisStore.has(key)) return Promise.resolve(null)
    redisStore.add(key)
    return Promise.resolve('OK')
  })
  prisma.user.findUnique.mockResolvedValue(mockUser)
  prisma.userProductRole.upsert.mockResolvedValue({ id: 'role-1', userId: mockUser.id, product: PRODUCT, role: PRODUCT_ROLE })
  jwtService.signAccessToken.mockReturnValue('mock-access-token')
  jwtService.createRefreshToken.mockResolvedValue('mock-refresh-token')
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function validClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sub:    'portal-user-id',
    email:  mockUser.email,
    type:   'product_launch',
    target: PRODUCT,
    iss:    'uamsatech',
    aud:    PRODUCT,
    jti:    randomUUID(),
    ...overrides,
  }
}

/** Mirrors the portal's signLaunchToken: HS256, iat, 5-minute exp, jti. */
function buildLaunchToken(overrides: Record<string, unknown> = {}, secret = CRAFT_LAUNCH_SECRET, opts: jwt.SignOptions = {}): string {
  const claims = validClaims(overrides)
  for (const k of Object.keys(claims)) if (claims[k] === undefined) delete claims[k]
  return jwt.sign(claims, secret, { algorithm: 'HS256', expiresIn: '5m', ...opts })
}

function buildApp(): express.Application {
  const app = express()
  app.use(express.json())
  app.get('/api/auth/sso', authController.ssoCallback)
  app.get('/api/protected', authenticate, (_req, res) => { res.json({ ok: true }) })
  app.use((err: { statusCode?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(err.statusCode ?? 500).json({ status: 'error', message: err.message })
  })
  return app
}

const sso = (token: string) => supertest(buildApp()).get(`/api/auth/sso?token=${encodeURIComponent(token)}`)

// ── P0-01: launch-token verification ──────────────────────────────────────────

describe(`P0-01: SSO launch token verification (${PRODUCT})`, () => {
  it('accepts a valid launch token signed with CRAFT_LAUNCH_SECRET and issues a product session', async () => {
    const res = await sso(buildLaunchToken())
    expect(res.status).toBe(302)
    expect(res.headers.location).toMatch(new RegExp(`^${FRONTEND_URL}/auth/sso\\?at=`))
    expect(jwtService.signAccessToken).toHaveBeenCalledTimes(1)
  })

  it('records the jti atomically with SET ... EX <ttl> NX', async () => {
    const jti = randomUUID()
    await sso(buildLaunchToken({ jti }))
    expect(redis.set).toHaveBeenCalledWith(`sso:jti:${jti}`, '1', 'EX', expect.any(Number), 'NX')
    const ttl = redis.set.mock.calls[0][3] as number
    expect(ttl).toBeGreaterThanOrEqual(300) // must outlive the 5-min token
  })

  it('rejects a token signed with this product\'s JWT_ACCESS_SECRET (all other claims valid)', async () => {
    const res = await sso(buildLaunchToken({}, JWT_ACCESS_SECRET))
    expect(res.status).toBe(401)
  })

  it('rejects a token signed with an arbitrary wrong secret', async () => {
    const res = await sso(buildLaunchToken({}, 'some-other-secret-that-is-at-least-32-chars'))
    expect(res.status).toBe(401)
  })

  it('rejects a token with the wrong audience', async () => {
    expect((await sso(buildLaunchToken({ aud: OTHER_PRODUCT }))).status).toBe(401)
  })

  it('rejects a token with no audience', async () => {
    expect((await sso(buildLaunchToken({ aud: undefined }))).status).toBe(401)
  })

  it('rejects a token with the wrong target', async () => {
    expect((await sso(buildLaunchToken({ target: OTHER_PRODUCT }))).status).toBe(401)
  })

  it(`rejects a genuine ${OTHER_PRODUCT} launch token (cross-product isolation)`, async () => {
    expect((await sso(buildLaunchToken({ target: OTHER_PRODUCT, aud: OTHER_PRODUCT }))).status).toBe(401)
  })

  it(`rejects the legacy '${LEGACY_ID}' target`, async () => {
    expect((await sso(buildLaunchToken({ target: LEGACY_ID, aud: LEGACY_ID }))).status).toBe(401)
  })

  it('rejects a token with the wrong issuer', async () => {
    expect((await sso(buildLaunchToken({ iss: 'evil-issuer' }))).status).toBe(401)
  })

  it('rejects a token with no issuer', async () => {
    expect((await sso(buildLaunchToken({ iss: undefined }))).status).toBe(401)
  })

  it('rejects an expired launch token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = jwt.sign(validClaims({ iat: now - 400, exp: now - 60 }), CRAFT_LAUNCH_SECRET, { algorithm: 'HS256' })
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a token whose lifetime exceeds 5 minutes, even if exp is in the future', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = jwt.sign(validClaims({ iat: now - 360, exp: now + 3600 }), CRAFT_LAUNCH_SECRET, { algorithm: 'HS256' })
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a token with no exp claim', async () => {
    const token = jwt.sign(validClaims(), CRAFT_LAUNCH_SECRET, { algorithm: 'HS256' })
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a token with no iat claim', async () => {
    const token = buildLaunchToken({}, CRAFT_LAUNCH_SECRET, { noTimestamp: true })
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a token with the wrong type claim', async () => {
    expect((await sso(buildLaunchToken({ type: 'access' }))).status).toBe(401)
  })

  it('rejects a token with no type claim', async () => {
    expect((await sso(buildLaunchToken({ type: undefined }))).status).toBe(401)
  })

  it('rejects a launch token missing jti, without touching Redis', async () => {
    expect((await sso(buildLaunchToken({ jti: undefined }))).status).toBe(401)
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('rejects a launch token with a non-string jti', async () => {
    expect((await sso(buildLaunchToken({ jti: 12345 }))).status).toBe(401)
  })

  it('rejects a launch token missing sub', async () => {
    expect((await sso(buildLaunchToken({ sub: undefined }))).status).toBe(401)
  })

  it('rejects a launch token missing email', async () => {
    expect((await sso(buildLaunchToken({ email: undefined }))).status).toBe(400)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejects an unsigned (alg: none) token', async () => {
    const token = jwt.sign(validClaims(), '', { algorithm: 'none', expiresIn: '5m' } as jwt.SignOptions)
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a token signed with a non-HS256 algorithm (HS512) and the right secret', async () => {
    const token = buildLaunchToken({}, CRAFT_LAUNCH_SECRET, { algorithm: 'HS512' })
    expect((await sso(token)).status).toBe(401)
  })

  it('rejects a replayed launch token (same jti presented twice)', async () => {
    const token = buildLaunchToken()
    expect((await sso(token)).status).toBe(302)
    expect((await sso(token)).status).toBe(401)
    expect(jwtService.signAccessToken).toHaveBeenCalledTimes(1)
  })

  it('fails CLOSED when Redis errors: 503, no user lookup, no session issued', async () => {
    redis.set.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:6379'))
    const res = await sso(buildLaunchToken())
    expect(res.status).toBe(503)
    expect(res.body.message).not.toMatch(/ECONNREFUSED|6379/)
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(jwtService.signAccessToken).not.toHaveBeenCalled()
  })

  it('fails closed when Redis returns an unexpected reply', async () => {
    redis.set.mockResolvedValue(undefined)
    expect((await sso(buildLaunchToken())).status).toBe(401)
    expect(jwtService.signAccessToken).not.toHaveBeenCalled()
  })

  it('rejects a request with no token', async () => {
    expect((await supertest(buildApp()).get('/api/auth/sso')).status).toBe(400)
  })

  it('rejects a normal product API access token presented as a launch token', async () => {
    const accessToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: PRODUCT_ROLE },
      JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    )
    expect((await sso(accessToken)).status).toBe(401)
  })
})

// ── P0-01: launch tokens are not API credentials ──────────────────────────────

describe('P0-01: normal API authentication rejects launch tokens', () => {
  it('authenticate() rejects a valid launch token used as a Bearer token', async () => {
    const res = await supertest(buildApp()).get('/api/protected').set('Authorization', `Bearer ${buildLaunchToken()}`)
    expect(res.status).toBe(401)
  })

  it('authenticate() still accepts a genuine access token (control)', async () => {
    const accessToken = jwt.sign(
      { userId: mockUser.id, email: mockUser.email, role: PRODUCT_ROLE, institutionId: null, roleSlug: 'x' },
      JWT_ACCESS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    )
    const res = await supertest(buildApp()).get('/api/protected').set('Authorization', `Bearer ${accessToken}`)
    expect(res.status).toBe(200)
  })
})

// ── P0-02: CSRF uses the validated COOKIE_SECRET ──────────────────────────────

describe('P0-02: CSRF middleware uses the validated env.COOKIE_SECRET', () => {
  function sign(secret: string): string {
    const nonce = 'aabbccddeeff00112233445566778899'
    const ts    = Date.now().toString(36)
    const sig   = createHmac('sha256', secret).update(`${nonce}:${ts}`).digest('hex')
    return `${nonce}:${ts}:${sig}`
  }

  function runProtection(token: string | undefined): { passed: boolean; status?: number } {
    const req = {
      method:  'POST',
      path:    '/api/anything',
      headers: token ? { 'x-csrf-token': token } : {},
      cookies: token ? { lc_csrf: token } : {},
    } as unknown as Request
    const next = jest.fn()
    try {
      security.csrfProtection(req, {} as Response, next)
      return { passed: next.mock.calls.length === 1 }
    } catch (err) {
      return { passed: false, status: (err as { statusCode?: number }).statusCode }
    }
  }

  it('a token issued by csrfTokenMiddleware is accepted by csrfProtection (round trip)', () => {
    const res = { cookie: jest.fn(), json: jest.fn() }
    security.csrfTokenMiddleware({} as Request, res as unknown as Response)
    const issued = (res.json.mock.calls[0][0] as { csrfToken: string }).csrfToken
    expect(res.cookie).toHaveBeenCalledWith('lc_csrf', issued, expect.any(Object))
    expect(runProtection(issued)).toEqual({ passed: true })
  })

  it('a token HMAC-signed with env COOKIE_SECRET is accepted (middleware uses the validated secret)', () => {
    expect(runProtection(sign(COOKIE_SECRET))).toEqual({ passed: true })
  })

  it.each([
    ['csrf-fallback-secret'],
    ['change-me-in-production-cookie-secret-min-32'],
  ])('a token forged with the old fallback secret %p is rejected with 403', (fallback) => {
    expect(runProtection(sign(fallback))).toEqual({ passed: false, status: 403 })
  })

  it('a state-changing request with no CSRF token is rejected with 403', () => {
    expect(runProtection(undefined)).toEqual({ passed: false, status: 403 })
  })
})

// ── P0-03: canonical product identifier ───────────────────────────────────────

describe(`P0-03: product identifier is ${PRODUCT}`, () => {
  it(`ssoCallback upserts UserProductRole with product=${PRODUCT}`, async () => {
    await sso(buildLaunchToken())
    expect(prisma.userProductRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { userId_product: { userId: mockUser.id, product: PRODUCT } },
        create: expect.objectContaining({ product: PRODUCT, role: PRODUCT_ROLE }),
      }),
    )
  })

  it(`never uses the legacy '${LEGACY_ID}' identifier`, async () => {
    await sso(buildLaunchToken())
    expect(JSON.stringify(prisma.userProductRole.upsert.mock.calls)).not.toContain(LEGACY_ID)
  })
})
