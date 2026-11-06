import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../../config/env'
import { prisma } from '../../config/database'
import type { AuthPayload } from '../../middleware/auth.middleware'
import { AppError } from '../../utils/errors'
import { PRODUCT_ID } from '../../config/product'
import { requireCentralEntitlement } from './central-entitlement'

const MS_IN_DAY = 86_400_000

function parseDuration(dur: string): number {
  const match = dur.match(/^(\d+)([smhd])$/)
  if (!match) return 15 * 60 * 1000
  const n = parseInt(match[1])
  return match[2] === 's' ? n * 1000
    : match[2] === 'm' ? n * 60_000
    : match[2] === 'h' ? n * 3_600_000
    : n * MS_IN_DAY
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * `notAfter` (AS-P0-SECURITY-006A): the verified central paid-through instant.
 * A refresh token never outlives the entitlement it was issued under.
 */
export async function createRefreshToken(userId: string, notAfter?: Date): Promise<string> {
  const token     = uuidv4()
  const ttlEnd    = Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN)
  const expiresAt = new Date(notAfter ? Math.min(ttlEnd, notAfter.getTime()) : ttlEnd)
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string; payload: AuthPayload }> {
  const stored = await prisma.refreshToken.findUnique({
    where:   { token: oldToken },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date()) {
    if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } })
    throw new Error('Invalid or expired refresh token')
  }

  // AS-P0-SECURITY-006A: a refresh is a new grant of access. Re-check the
  // account and central entitlement BEFORE issuing anything; on denial the
  // presented token is revoked, so the session cannot be renewed again.
  if (stored.user.status === 'SUSPENDED' || stored.user.status === 'INACTIVE') {
    await prisma.refreshToken.delete({ where: { id: stored.id } })
    throw AppError.forbidden('Your account is not active')
  }
  let paidThrough: Date
  try {
    paidThrough = await requireCentralEntitlement(PRODUCT_ID, stored.user.email)
  } catch (err) {
    // 403 = definitive denial: end the session. 503 = no decision: keep the
    // token so the user can retry once the portal is reachable, but issue nothing.
    if (err instanceof AppError && err.statusCode === 403) {
      await prisma.refreshToken.delete({ where: { id: stored.id } })
    }
    throw err
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })

  const payload: AuthPayload = {
    userId:        stored.user.id,
    email:         stored.user.email,
    role:          stored.user.role,
    institutionId: stored.user.institutionId,
    roleSlug:      stored.user.role === 'STUDENT' ? 'student' : 'lecturer',
  }

  const accessToken  = signAccessToken(payload)
  const refreshToken = await createRefreshToken(stored.user.id, paidThrough)

  return { accessToken, refreshToken, payload }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } })
}

export function verifyAccessToken(token: string): AuthPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload
}
