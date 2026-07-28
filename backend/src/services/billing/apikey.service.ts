import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

const KEY_PREFIX = 'lc_'
const SALT_ROUNDS = 10

function generateRawKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString('hex')
}

export const apikeyService = {
  async generateAPIKey(institutionId: string, userId: string, name: string, scopes: string[] = []) {
    const rawKey = generateRawKey()
    const keyPrefix = rawKey.slice(0, 11) // 'lc_' + first 8 hex chars
    const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS)

    const apiKey = await prisma.aPIKey.create({
      data: { institutionId, name, keyHash, keyPrefix, scopes, createdBy: userId },
    })

    return { rawKey, apiKey: { ...apiKey, keyHash: undefined } }
  },

  async validateAPIKey(rawKey: string) {
    const prefix = rawKey.slice(0, 11)
    const candidates = await prisma.aPIKey.findMany({
      where: { keyPrefix: prefix, active: true },
      include: { institution: true },
    })

    for (const key of candidates) {
      const match = await bcrypt.compare(rawKey, key.keyHash)
      if (match) {
        if (key.expiresAt && key.expiresAt < new Date()) {
          throw AppError.unauthorized('API key has expired')
        }
        await prisma.aPIKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        return key
      }
    }

    throw AppError.unauthorized('Invalid API key')
  },

  async listAPIKeys(institutionId: string) {
    const keys = await prisma.aPIKey.findMany({
      where: { institutionId },
      orderBy: { createdAt: 'desc' },
      include: { creator: { select: { id: true, name: true } } },
    })
    return keys.map((k) => ({ ...k, keyHash: undefined }))
  },

  async revokeAPIKey(id: string, requestingInstitutionId: string) {
    const key = await prisma.aPIKey.findUnique({ where: { id } })
    if (!key) throw AppError.notFound('API Key')
    if (key.institutionId !== requestingInstitutionId) throw AppError.forbidden()

    return prisma.aPIKey.update({
      where: { id },
      data: { active: false, revokedAt: new Date() },
    })
  },

  async rotateAPIKey(id: string, requestingInstitutionId: string) {
    const key = await prisma.aPIKey.findUnique({ where: { id } })
    if (!key) throw AppError.notFound('API Key')
    if (key.institutionId !== requestingInstitutionId) throw AppError.forbidden()

    const rawKey = generateRawKey()
    const keyPrefix = rawKey.slice(0, 11)
    const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS)

    const updated = await prisma.aPIKey.update({
      where: { id }, data: { keyHash, keyPrefix },
    })

    return { rawKey, apiKey: { ...updated, keyHash: undefined } }
  },
}
