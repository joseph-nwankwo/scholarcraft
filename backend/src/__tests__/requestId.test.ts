import supertest from 'supertest'
import express from 'express'
import { requestIdMiddleware } from '../middleware/requestId.middleware'

const app = express()
app.use(requestIdMiddleware)
app.get('/test', (req, res) => {
  res.json({ requestId: req.requestId, correlationId: req.correlationId })
})

describe('requestIdMiddleware', () => {
  it('generates a requestId when none is provided', async () => {
    const res = await supertest(app).get('/test')
    expect(res.body.requestId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('uses X-Request-ID header if provided', async () => {
    const id = 'my-custom-id'
    const res = await supertest(app).get('/test').set('X-Request-ID', id)
    expect(res.body.requestId).toBe(id)
    expect(res.headers['x-request-id']).toBe(id)
  })

  it('correlationId defaults to requestId if not separately provided', async () => {
    const res = await supertest(app).get('/test')
    expect(res.body.requestId).toBe(res.body.correlationId)
  })

  it('uses X-Correlation-ID header if provided', async () => {
    const cid = 'trace-abc-123'
    const res = await supertest(app).get('/test').set('X-Correlation-ID', cid)
    expect(res.body.correlationId).toBe(cid)
    expect(res.headers['x-correlation-id']).toBe(cid)
  })
})
