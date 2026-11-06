import type { Request, Response, NextFunction } from 'express'
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import rateLimit from 'express-rate-limit'
import { AppError } from '../utils/errors'
import { env } from '../config/env'

// ── CSRF Token (Double-Submit Cookie pattern) ─────────────────────────────────
// Used for state-mutating requests from browser clients.
// SPA clients that store tokens in memory (not cookies) are naturally CSRF-safe,
// but we add this layer for defense-in-depth.

const CSRF_SECRET = env.COOKIE_SECRET
const CSRF_HEADER = 'x-csrf-token'
const CSRF_COOKIE = 'lc_csrf'
const CSRF_EXPIRY = 4 * 60 * 60 * 1000 // 4 hours

function generateCsrfToken(): string {
  const nonce = randomBytes(16).toString('hex')
  const ts    = Date.now().toString(36)
  const sig   = createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}:${ts}`)
    .digest('hex')
  return `${nonce}:${ts}:${sig}`
}

function verifyCsrfToken(token: string): boolean {
  const parts = token.split(':')
  if (parts.length !== 3) return false
  const [nonce, tsHex, sig] = parts as [string, string, string]
  const ts = parseInt(tsHex, 36)
  if (Date.now() - ts > CSRF_EXPIRY) return false
  const expected = createHmac('sha256', CSRF_SECRET)
    .update(`${nonce}:${tsHex}`)
    .digest('hex')
  return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
}

export function csrfTokenMiddleware(_req: Request, res: Response): void {
  const token = generateCsrfToken()
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,   // must be readable by JS to send as header
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   CSRF_EXPIRY,
  })
  res.json({ csrfToken: token })
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  // Safe methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return }
  // Skip for API clients that use Bearer tokens (they can't be CSRF-tricked)
  const authHeader = req.headers['authorization']
  if (authHeader?.startsWith('Bearer ')) { next(); return }
  // Webhook endpoints are authenticated via signature
  if (req.path.startsWith('/api/billing/webhooks')) { next(); return }

  const headerToken = req.headers[CSRF_HEADER] as string | undefined
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined

  if (!headerToken || !cookieToken || headerToken !== cookieToken || !verifyCsrfToken(headerToken)) {
    throw new AppError('Invalid or missing CSRF token', 403)
  }
  next()
}

// ── Brute-Force Protection (login endpoint) ────────────────────────────────────
export const bruteForceAuthLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,  // 15 minutes
  max:             10,               // max 10 failed attempts per IP
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,      // only count failures
  message: { status: 'error', message: 'Too many failed login attempts. Please wait 15 minutes before trying again.' },
})

// ── Input sanitization (XSS prevention) ──────────────────────────────────────
// Strips tags from string body fields (defense-in-depth; primary XSS protection
// is React's JSX escaping and Content-Security-Policy at the edge).

function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Fields that contain raw document/file text passed to the AI — sanitizing these
// corrupts legitimate content (e.g. "only=", "onload" in academic text).
const PASSTHROUGH_KEYS = new Set(['sourceContext', 'customInstructions'])

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return sanitizeString(obj)
  if (Array.isArray(obj)) return obj.map((v) => sanitizeObject(v))
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
      k,
      PASSTHROUGH_KEYS.has(k) ? v : sanitizeObject(v),
    ]),
  )
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body) as typeof req.body
  }
  next()
}

// ── Security response headers ─────────────────────────────────────────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.removeHeader('X-Powered-By')
  res.setHeader('X-DNS-Prefetch-Control', 'off')
  res.setHeader('X-Download-Options', 'noopen')
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none')
  next()
}

// ── File upload validation ────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_FILE_SIZE = 25 * 1024 * 1024  // 25 MB

export function validateFileUpload(req: Request, _res: Response, next: NextFunction): void {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    next(); return
  }
  const files = req.files
    ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
    : req.file ? [req.file] : []

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new AppError(`File "${file.originalname}" exceeds the 25MB size limit`, 400)
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new AppError(`File type "${file.mimetype}" is not allowed`, 400)
    }
    // Magic-byte check for PDFs (first 4 bytes should be %PDF)
    if (file.mimetype === 'application/pdf' && file.buffer) {
      const magic = file.buffer.slice(0, 4).toString('ascii')
      if (!magic.startsWith('%PDF')) {
        throw new AppError('Invalid PDF file', 400)
      }
    }
  }
  next()
}
