import supertest from 'supertest'
import express from 'express'
import { requestIdMiddleware } from '../middleware/requestId.middleware'

// Minimal app for health endpoint tests (no DB connection required)
function buildApp() {
  const app = express()
  app.use(requestIdMiddleware)
  app.get('/health', (_req, res) => {
    res.json({
      status:    'ok',
      timestamp: new Date().toISOString(),
      version:   '1.0.0',
      uptime:    Math.floor(process.uptime()),
    })
  })
  return app
}

const app = buildApp()

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await supertest(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
    expect(res.body.uptime).toBeGreaterThanOrEqual(0)
  })

  it('includes X-Request-ID header', async () => {
    const res = await supertest(app).get('/health')
    expect(res.headers['x-request-id']).toBeDefined()
  })

  it('echoes provided X-Request-ID', async () => {
    const requestId = 'test-request-id-123'
    const res = await supertest(app)
      .get('/health')
      .set('X-Request-ID', requestId)
    expect(res.headers['x-request-id']).toBe(requestId)
  })
})
