import { Router } from 'express'
import { register } from '../utils/metrics'
import { env } from '../config/env'
import { AppError } from '../utils/errors'

const router = Router()

// Prometheus scrape endpoint
// Protected by a shared secret in production to prevent public exposure.
router.get('/', async (req, res, next) => {
  try {
    // Allow only Prometheus scraper (by secret header) or localhost in production
    if (env.NODE_ENV === 'production') {
      const token = req.headers['x-metrics-token']
      const metricsSecret = process.env.METRICS_SECRET
      if (metricsSecret && token !== metricsSecret) {
        const remoteIp = req.ip ?? ''
        const isLocalhost = remoteIp === '127.0.0.1' || remoteIp === '::1' || remoteIp.includes('172.')
        if (!isLocalhost) {
          throw new AppError('Unauthorized', 403)
        }
      }
    }
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  } catch (err) {
    next(err)
  }
})

export default router
