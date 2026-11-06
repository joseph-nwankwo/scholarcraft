/**
 * P0-02 / P0-01 — Environment validation (AS-P0-SECURITY-002)
 *
 * COOKIE_SECRET must be explicitly configured (no hardcoded default), and
 * CRAFT_LAUNCH_SECRET must be distinct from this product's JWT secrets.
 * Tests the exported schema directly, plus the real startup guard in env.ts.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Keep the developer's local backend/.env out of these tests.
jest.mock('dotenv', () => ({ config: jest.fn() }))

const VALID = {
  DATABASE_URL:        'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET:   'test-jwt-access-secret-min-32-chars-long!!',
  JWT_REFRESH_SECRET:  'test-jwt-refresh-secret-min-32-chars-long!',
  CRAFT_LAUNCH_SECRET: 'test-craft-launch-secret-min-32-chars-long!',
  COOKIE_SECRET:       'test-cookie-secret-min-32-chars-long!!!!!!!',
  CENTRAL_ENTITLEMENT_URL:            'http://portal.test/api/internal/entitlements/verify',
  CENTRAL_ENTITLEMENT_SERVICE_SECRET: 'test-central-entitlement-service-secret-0123',
}
const OLD_FALLBACKS = ['change-me-in-production-cookie-secret-min-32', 'csrf-fallback-secret']

const savedEnv = { ...process.env }
Object.assign(process.env, VALID)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { envSchema } = require('../config/env') as typeof import('../config/env')

afterAll(() => { process.env = savedEnv })

function without<K extends keyof typeof VALID>(key: K): Record<string, string> {
  const copy: Record<string, string> = { ...VALID }
  delete copy[key]
  return copy
}

describe('P0-02: COOKIE_SECRET validation', () => {
  it('rejects a missing COOKIE_SECRET', () => {
    const r = envSchema.safeParse(without('COOKIE_SECRET'))
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.COOKIE_SECRET).toContain('COOKIE_SECRET is required')
  })

  it('rejects a missing COOKIE_SECRET in production', () => {
    expect(envSchema.safeParse({ ...without('COOKIE_SECRET'), NODE_ENV: 'production' }).success).toBe(false)
  })

  it('rejects an empty COOKIE_SECRET', () => {
    expect(envSchema.safeParse({ ...VALID, COOKIE_SECRET: '' }).success).toBe(false)
  })

  it('rejects a COOKIE_SECRET shorter than 32 characters', () => {
    const r = envSchema.safeParse({ ...VALID, COOKIE_SECRET: 'x'.repeat(31) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.COOKIE_SECRET).toContain('COOKIE_SECRET must be at least 32 chars')
  })

  it('accepts an explicitly configured 32+ character COOKIE_SECRET verbatim', () => {
    const r = envSchema.safeParse({ ...VALID, COOKIE_SECRET: 'y'.repeat(32) })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.COOKIE_SECRET).toBe('y'.repeat(32))
  })

  it('never supplies a default for COOKIE_SECRET', () => {
    const r = envSchema.safeParse(without('COOKIE_SECRET'))
    expect(r.success).toBe(false)
    expect(JSON.stringify(r)).not.toContain(OLD_FALLBACKS[0])
  })
})

describe('P0-01: CRAFT_LAUNCH_SECRET validation', () => {
  it('rejects a missing CRAFT_LAUNCH_SECRET', () => {
    expect(envSchema.safeParse(without('CRAFT_LAUNCH_SECRET')).success).toBe(false)
  })

  it('rejects CRAFT_LAUNCH_SECRET equal to JWT_ACCESS_SECRET', () => {
    const r = envSchema.safeParse({ ...VALID, CRAFT_LAUNCH_SECRET: VALID.JWT_ACCESS_SECRET })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.flatten().fieldErrors.CRAFT_LAUNCH_SECRET?.[0]).toMatch(/must differ/)
  })

  it('rejects CRAFT_LAUNCH_SECRET equal to JWT_REFRESH_SECRET', () => {
    expect(envSchema.safeParse({ ...VALID, CRAFT_LAUNCH_SECRET: VALID.JWT_REFRESH_SECRET }).success).toBe(false)
  })

  it('accepts distinct secrets', () => {
    expect(envSchema.safeParse(VALID).success).toBe(true)
  })
})

describe('P0-02: startup guard', () => {
  it('env.ts exits the process when COOKIE_SECRET is missing', () => {
    const exit  = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => { throw new Error(`exit:${code}`) }) as never)
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    delete process.env.COOKIE_SECRET
    try {
      expect(() => jest.isolateModules(() => { require('../config/env') })).toThrow('exit:1')
      expect(exit).toHaveBeenCalledWith(1)
    } finally {
      process.env.COOKIE_SECRET = VALID.COOKIE_SECRET
      exit.mockRestore()
      error.mockRestore()
    }
  })

  it('env.ts loads and exposes the configured COOKIE_SECRET when valid', () => {
    let loaded: { COOKIE_SECRET: string } | undefined
    jest.isolateModules(() => { loaded = (require('../config/env') as { env: { COOKIE_SECRET: string } }).env })
    expect(loaded?.COOKIE_SECRET).toBe(VALID.COOKIE_SECRET)
  })
})

describe('P0-02: no hardcoded cookie/CSRF secret fallbacks in application source', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p)
      return p.endsWith('.ts') ? [p] : []
    })
  }

  it.each(OLD_FALLBACKS)('no source file contains %p', (needle) => {
    const hits = sourceFiles(join(__dirname, '..')).filter((f) => readFileSync(f, 'utf8').includes(needle))
    expect(hits).toEqual([])
  })

  it('no source file reads COOKIE_SECRET from process.env with a fallback', () => {
    const pattern = /process\.env\.COOKIE_SECRET\s*(\?\?|\|\|)/
    const hits = sourceFiles(join(__dirname, '..')).filter((f) => pattern.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})
