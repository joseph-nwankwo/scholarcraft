import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../../config/env'
import { prisma } from '../../config/database'
import type { AuthPayload } from '../../middleware/auth.middleware'

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

export async function createRefreshToken(userId: string): Promise<string> {
  const token     = uuidv4()
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN))
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

  await prisma.refreshToken.delete({ where: { id: stored.id } })

  const payload: AuthPayload = {
    userId:        stored.user.id,
    email:         stored.user.email,
    role:          stored.user.role,
    institutionId: stored.user.institutionId,
    roleSlug:      stored.user.role === 'STUDENT' ? 'student' : 'lecturer',
  }

  const accessToken  = signAccessToken(payload)
  const refreshToken = await createRefreshToken(stored.user.id)

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
