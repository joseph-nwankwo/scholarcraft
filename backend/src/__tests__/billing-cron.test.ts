/**
 * AS-P0-SECURITY-006A — the duplicate commercial billing cron is no longer
 * registered or executable; operational and academic jobs remain.
 * Kept in its own file because it mocks `net` and `bullmq` process-wide.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

process.env.DATABASE_URL                       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET                  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET                 = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET                = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'

jest.mock('dotenv', () => ({ config: jest.fn() }))

const mockAdds: { queue: string; name: string; opts: unknown }[] = []
const mockRemoved: { queue: string; name: string; opts: unknown }[] = []
const mockProcessors: Record<string, (job: { name: string; data?: unknown }) => Promise<unknown>> = {}
jest.mock('bullmq', () => ({
  Queue: class {
    constructor(private readonly qn: string) {}
    add(name: string, _data: unknown, opts: unknown) { mockAdds.push({ queue: this.qn, name, opts }); return Promise.resolve() }
    removeRepeatable(name: string, opts: unknown) { mockRemoved.push({ queue: this.qn, name, opts }); return Promise.resolve(true) }
  },
  Worker: class {
    constructor(name: string, proc: (job: { name: string }) => Promise<unknown>) { mockProcessors[name] = proc }
    on() { return this }
  },
}))
jest.mock('net', () => {
  const connect = (_p: number, _h: string, cb: () => void) => { setImmediate(cb); return { destroy() {}, on() {} } }
  return { __esModule: true, default: { connect }, connect }
})
const mockSubscriptionService = { processExpiredTrials: jest.fn(), renewSubscription: jest.fn() }
jest.mock('../services/billing/subscription.service', () => ({ subscriptionService: mockSubscriptionService }))
jest.mock('../config/database', () => ({ prisma: {} }))

async function loadWorker() {
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  require('../workers/billing.worker')
  for (let i = 0; i < 20 && !mockProcessors['billing:renewal']; i++) await new Promise((r) => setImmediate(r))
  await new Promise((r) => setImmediate(r))
}

describe('billing worker — commercial cron disabled', () => {
  beforeAll(loadWorker)

  it("no longer schedules 'expire-trials'", () => {
    expect(mockAdds.map((a) => a.name)).not.toContain('expire-trials')
  })

  it('removes a previously stored expire-trials schedule (best effort)', () => {
    expect(mockRemoved).toContainEqual({ queue: 'billing:renewal', name: 'expire-trials', opts: { pattern: '0 2 * * *' } })
  })

  it.each(['expire-trials', 'renew-subscription'])('a %s job (e.g. from an old stored schedule) is refused without touching records', async (name) => {
    const out = await mockProcessors['billing:renewal']({ name, data: { institutionId: 'inst-1' } })
    expect(out).toEqual({ skipped: true, reason: 'billing_managed_centrally' })
    expect(mockSubscriptionService.processExpiredTrials).not.toHaveBeenCalled()
    expect(mockSubscriptionService.renewSubscription).not.toHaveBeenCalled()
  })

  it('operational usage aggregation is still scheduled', () => {
    expect(mockAdds).toContainEqual(expect.objectContaining({ queue: 'billing:usage', name: 'aggregate-usage' }))
  })
})

describe('academic scheduled jobs are untouched', () => {
  it('collaboration worker still registers its reminder, digest and analytics schedules', () => {
    const src = readFileSync(join(__dirname, '../workers/collaboration.worker.ts'), 'utf8')
    expect(src).toMatch(/reminderQueue\.add\('check'/)
    expect(src).toMatch(/digestQueue\.add\('daily'/)
    expect(src).toMatch(/analyticsQueue\.add\('hourly'/)
  })
})
