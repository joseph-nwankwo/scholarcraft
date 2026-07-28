import { prisma } from '../../config/database'
import type { PresenceStatus } from '@prisma/client'

// In-memory presence map for instant lookups (supplements DB)
const presenceCache = new Map<string, { status: PresenceStatus; lastSeenAt: Date }>()

export const presenceService = {
  async setPresence(userId: string, status: PresenceStatus, statusText?: string) {
    presenceCache.set(userId, { status, lastSeenAt: new Date() })
    return prisma.presence.upsert({
      where: { userId },
      update: { status, statusText, lastSeenAt: new Date() },
      create: { userId, status, statusText },
    })
  },

  async getPresence(userId: string): Promise<{ status: PresenceStatus; lastSeenAt: Date }> {
    const cached = presenceCache.get(userId)
    if (cached) return cached

    const dbRecord = await prisma.presence.findUnique({ where: { userId } })
    return { status: dbRecord?.status ?? 'OFFLINE', lastSeenAt: dbRecord?.lastSeenAt ?? new Date(0) }
  },

  async getBulkPresence(userIds: string[]): Promise<Map<string, PresenceStatus>> {
    const result = new Map<string, PresenceStatus>()
    const missing: string[] = []

    for (const id of userIds) {
      const cached = presenceCache.get(id)
      if (cached) result.set(id, cached.status)
      else { result.set(id, 'OFFLINE'); missing.push(id) }
    }

    if (missing.length > 0) {
      const records = await prisma.presence.findMany({ where: { userId: { in: missing } } })
      for (const r of records) {
        result.set(r.userId, r.status)
        presenceCache.set(r.userId, { status: r.status, lastSeenAt: r.lastSeenAt })
      }
    }

    return result
  },

  async setOffline(userId: string) {
    presenceCache.delete(userId)
    await prisma.presence.upsert({
      where: { userId },
      update: { status: 'OFFLINE', lastSeenAt: new Date() },
      create: { userId, status: 'OFFLINE' },
    })
  },

  async heartbeat(userId: string) {
    presenceCache.set(userId, { status: 'ONLINE', lastSeenAt: new Date() })
    await prisma.presence.upsert({
      where: { userId },
      update: { status: 'ONLINE', lastSeenAt: new Date() },
      create: { userId, status: 'ONLINE' },
    })
  },

  getOnlineUserIds(_institutionId?: string): string[] {
    return [...presenceCache.keys()]
  },

  async sweepStale(staleThresholdMs = 5 * 60 * 1000) {
    const now = Date.now()
    const stale: string[] = []
    for (const [userId, data] of presenceCache.entries()) {
      if (now - data.lastSeenAt.getTime() > staleThresholdMs) {
        presenceCache.delete(userId)
        stale.push(userId)
      }
    }
    if (stale.length > 0) {
      await prisma.presence.updateMany({
        where: { userId: { in: stale } },
        data: { status: 'OFFLINE' },
      })
    }
    return stale
  },
}
