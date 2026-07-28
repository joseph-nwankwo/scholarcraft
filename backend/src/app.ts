import './config/env'
import path from 'path'
import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import cookieParser from 'cookie-parser'

import { env } from './config/env'
import { prisma } from './config/database'
import { logger } from './utils/logger'
import { recordHttpMetrics } from './utils/metrics'
import { errorHandler } from './middleware/errorHandler'
import { defaultLimiter, authLimiter, aiLimiter } from './middleware/rateLimiter'
import { requestIdMiddleware } from './middleware/requestId.middleware'
import { sanitizeInput, securityHeaders } from './middleware/security.middleware'
import { roleService } from './services/role/role.service'

import authRoutes         from './routes/auth.routes'
import usersRoutes        from './routes/users.routes'
import institutionsRoutes from './routes/institutions.routes'
import billingRoutes      from './routes/billing.routes'
import plagiarismRoutes   from './routes/plagiarism.routes'
import studentRoutes      from './routes/student.routes'
import enrollmentRoutes   from './routes/enrollment.routes'
import submissionsRoutes  from './routes/submissions.routes'
import aiRoutes           from './routes/ai.routes'
import studyPlannerRoutes from './routes/study-planner.routes'
import gpaRoutes          from './routes/gpa.routes'
import studyToolsRoutes   from './routes/study-tools.routes'
import thesiscraftRoutes  from './routes/thesiscraft.routes'
import thesiscraftReferencesRoutes from './routes/thesiscraft-references.routes'
import metricsRoutes      from './routes/metrics.routes'
import { createSocketGateway } from './gateway/socket.gateway'

// ── Sentry (optional) ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null
if (process.env.SENTRY_DSN) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    Sentry = require('@sentry/node')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    Sentry.init({
      dsn:              process.env.SENTRY_DSN,
      environment:      env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
      release:          process.env.npm_package_version,
    })
    logger.info('Sentry initialized')
  } catch {
    logger.warn('Sentry could not be loaded — run: npm install @sentry/node')
    Sentry = null
  }
}

const app        = express()
const httpServer = http.createServer(app)

app.use(requestIdMiddleware)

app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }))
app.use(securityHeaders)

const allowedOrigins = env.NODE_ENV === 'development' ? true : env.FRONTEND_URL
app.use(cors({
  origin:         allowedOrigins,
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Correlation-ID', 'X-CSRF-Token'],
}))

app.set('trust proxy', 1)

app.use(compression())
app.use('/api/billing/webhooks', express.raw({ type: 'application/json', limit: '1mb' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser(env.COOKIE_SECRET))
app.use(sanitizeInput)

app.use(morgan(
  env.NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] :response-time ms'
    : 'dev',
  {
    stream: { write: (msg: string) => logger.http(msg.trim()) },
    skip: (_req, res) => res.statusCode < 400 && env.NODE_ENV === 'production',
  },
))

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.on('finish', () => {
    const route = (req.route?.path as string | undefined) ?? req.path
    recordHttpMetrics(req.method, route, res.statusCode, req.startTime)
  })
  next()
})

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api', defaultLimiter)
app.use('/api/auth/login',    authLimiter)
app.use('/api/auth/register', authLimiter)
app.use('/api/ai',            aiLimiter)
app.use('/api/plagiarism',    aiLimiter)

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    app:       'ScholarCraft',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '1.0.0',
    uptime:    Math.floor(process.uptime()),
  })
})

app.get('/health/ready', async (_req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {}
  let healthy = true
  try { await prisma.$queryRaw`SELECT 1`; checks.database = 'ok' }
  catch { checks.database = 'error'; healthy = false }
  try {
    const { redis: r } = await import('./config/redis')
    await r.ping(); checks.redis = 'ok'
  } catch { checks.redis = 'error' }
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ready' : 'degraded', timestamp: new Date().toISOString(), checks })
})

app.use('/metrics', metricsRoutes)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/users',        usersRoutes)
app.use('/api/institutions', institutionsRoutes)
app.use('/api/billing',      billingRoutes)
app.use('/api/plagiarism',   plagiarismRoutes)
app.use('/api/student',      studentRoutes)
app.use('/api/enrollments',  enrollmentRoutes)
app.use('/api/submissions',  submissionsRoutes)
app.use('/api/ai',           aiRoutes)
app.use('/api/study-planner',studyPlannerRoutes)
app.use('/api/gpa',          gpaRoutes)
app.use('/api/study-tools',  studyToolsRoutes)
app.use('/api/thesiscraft',  thesiscraftRoutes)
app.use('/api/thesiscraft',  thesiscraftReferencesRoutes)

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' })
})

if (Sentry) app.use(Sentry.expressErrorHandler())
app.use(errorHandler)

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
let shuttingDown = false
function gracefulShutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info(`Received ${signal}. Starting graceful shutdown…`)
  httpServer.close(async () => {
    try { await prisma.$disconnect(); logger.info('Database disconnected') }
    catch (err) { logger.error('Error during shutdown', { error: err }) }
    finally { process.exit(0) }
  })
  setTimeout(() => { logger.error('Graceful shutdown timed out — forcing exit'); process.exit(1) }, 30_000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  const msg = (reason as { code?: string; message?: string })?.code ?? (reason as Error)?.message ?? ''
  if (msg === 'ECONNREFUSED' || String(reason).includes('ECONNREFUSED')) return
  logger.error('Unhandled rejection', { reason })
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await prisma.$connect()
    logger.info('Database connected')

    await roleService.seedPermissions()
    logger.info('Permissions seeded')

    import('./workers/billing.worker').catch((err: unknown) =>
      logger.warn('Billing workers failed to import', { err: (err as Error).message }),
    )

    createSocketGateway(httpServer)
    logger.info('Socket.IO gateway initialized')

    httpServer.listen(env.PORT, () => {
      logger.info(`ScholarCraft API running on http://localhost:${env.PORT}`)
      logger.info(`Environment: ${env.NODE_ENV}`)
    })
  } catch (err) {
    logger.error('Failed to start server', { error: err })
    await prisma.$disconnect()
    process.exit(1)
  }
}

bootstrap()
