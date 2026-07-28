import winston from 'winston'
import { env } from '../config/env'

const { combine, timestamp, json, colorize, printf, errors } = winston.format

// ── Production JSON format (ELK / OpenSearch ready) ───────────────────────────
const jsonFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json(),
)

// ── Development pretty format ─────────────────────────────────────────────────
const prettyFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ timestamp: ts, level, message, requestId, correlationId, ...meta }) => {
    const rid = requestId ? ` [${String(requestId)}]` : ''
    const cid = correlationId ? ` (cid:${String(correlationId)})` : ''
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${ts}${rid}${cid} [${level}]: ${message}${metaStr}`
  }),
)

const transports: winston.transport[] = [new winston.transports.Console()]
const exceptionHandlers: winston.transport[] = [new winston.transports.Console()]
const rejectionHandlers: winston.transport[] = [new winston.transports.Console()]

if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log',    level: 'error', maxsize: 10_000_000, maxFiles: 5 }),
    new winston.transports.File({ filename: 'logs/combined.log',                maxsize: 10_000_000, maxFiles: 10 }),
  )
  exceptionHandlers.push(new winston.transports.File({ filename: 'logs/exceptions.log' }))
  rejectionHandlers.push(new winston.transports.File({ filename: 'logs/rejections.log' }))
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? jsonFormat : prettyFormat,
  defaultMeta: {
    service: 'scholarcraft-api',
    version: process.env.npm_package_version ?? '1.0.0',
    env: env.NODE_ENV,
  },
  transports,
  exceptionHandlers,
  rejectionHandlers,
})

// ── Child logger factory (carries request context) ────────────────────────────
export function createRequestLogger(requestId: string, correlationId?: string) {
  return logger.child({ requestId, correlationId: correlationId ?? requestId })
}

// ── Audit logger (writes to a separate stream in production) ──────────────────
const auditTransports: winston.transport[] = [new winston.transports.Console()]

if (env.NODE_ENV === 'production') {
  auditTransports.push(new winston.transports.File({ filename: 'logs/audit.log', maxsize: 20_000_000, maxFiles: 30 }))
}

export const auditLogger = winston.createLogger({
  level: 'info',
  format: jsonFormat,
  defaultMeta: { service: 'scholarcraft-audit' },
  transports: auditTransports,
})

export function logAudit(params: {
  action:       string
  userId?:      string
  institutionId?: string
  resource?:    string
  resourceId?:  string
  requestId?:   string
  ip?:          string
  meta?:        Record<string, unknown>
}) {
  auditLogger.info('audit_event', {
    ...params,
    timestamp: new Date().toISOString(),
  })
}
