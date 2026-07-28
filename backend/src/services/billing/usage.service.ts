import { startOfDay, endOfDay } from 'date-fns'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { logger } from '../../utils/logger'
import type { UsageMetricType } from '@prisma/client'

const METRIC_LABELS: Record<UsageMetricType, string> = {
  AI_TOKENS: 'AI Tokens',
  STORAGE_BYTES: 'Storage',
  DOCUMENTS: 'Documents',
  EXPORTS: 'Exports',
  API_CALLS: 'API Calls',
  ACTIVE_USERS: 'Active Users',
  COURSES: 'Courses',
}

export const usageService = {
  async getCurrentPeriodUsage(institutionId: string, metric: UsageMetricType): Promise<bigint> {
    const sub = await prisma.institutionSubscription.findUnique({ where: { institutionId } })
    if (!sub) return BigInt(0)

    const result = await prisma.usageRecord.aggregate({
      where: {
        institutionId,
        metric,
        periodStart: { gte: sub.currentPeriodStart },
        periodEnd: { lte: sub.currentPeriodEnd },
      },
      _sum: { value: true },
    })

    return result._sum.value ?? BigInt(0)
  },

  async recordUsage(institutionId: string, metric: UsageMetricType, amount: number | bigint) {
    const sub = await prisma.institutionSubscription.findUnique({ where: { institutionId } })

    const periodStart = sub?.currentPeriodStart ?? startOfDay(new Date())
    const periodEnd = sub?.currentPeriodEnd ?? endOfDay(new Date())

    const existing = await prisma.usageRecord.findFirst({
      where: {
        institutionId,
        metric,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
        subscriptionId: sub?.id ?? null,
      },
    })

    if (existing) {
      return prisma.usageRecord.update({
        where: { id: existing.id },
        data: { value: { increment: BigInt(amount) } },
      })
    }

    return prisma.usageRecord.create({
      data: {
        institutionId,
        subscriptionId: sub?.id,
        metric,
        value: BigInt(amount),
        periodStart,
        periodEnd,
      },
    })
  },

  async checkLimit(institutionId: string, metric: UsageMetricType, amount = 1): Promise<void> {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, include: { plan: true },
    })
    if (!sub) return // No subscription, no enforcement

    const plan = sub.plan
    let limit: number | null = null

    switch (metric) {
      case 'AI_TOKENS': limit = plan.monthlyAITokens; break
      case 'DOCUMENTS': limit = null; break // no per-plan document cap
      case 'EXPORTS': limit = plan.exportLimit; break
      case 'ACTIVE_USERS': limit = plan.maxUsers; break
      case 'COURSES': limit = plan.maxCourses; break
      case 'STORAGE_BYTES':
        limit = plan.maxStorageGB !== null ? plan.maxStorageGB * 1024 * 1024 * 1024 : null; break
      default: limit = null
    }

    if (limit === null) return // Unlimited

    const current = await this.getCurrentPeriodUsage(institutionId, metric)
    if (Number(current) + amount > limit) {
      throw AppError.badRequest(
        `${METRIC_LABELS[metric]} limit reached for your plan (${limit.toLocaleString()} max). ` +
        `Upgrade your plan to continue.`,
        'USAGE_LIMIT_EXCEEDED'
      )
    }
  },

  async getUsageSummary(institutionId: string) {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, include: { plan: true },
    })

    const metrics: UsageMetricType[] = ['AI_TOKENS', 'DOCUMENTS', 'EXPORTS', 'ACTIVE_USERS', 'COURSES']
    const usages = await Promise.all(metrics.map((m) => this.getCurrentPeriodUsage(institutionId, m)))

    const plan = sub?.plan

    function entry(metric: UsageMetricType, used: bigint, limit: number | null) {
      const u = Number(used)
      return {
        metric,
        label: METRIC_LABELS[metric],
        used: u,
        limit,
        percentage: limit !== null ? Math.min(100, Math.round((u / limit) * 100)) : 0,
        unlimited: limit === null,
      }
    }

    return {
      periodStart: sub?.currentPeriodStart ?? null,
      periodEnd: sub?.currentPeriodEnd ?? null,
      plan: plan ? { name: plan.name, slug: plan.slug } : null,
      metrics: {
        aiTokens: entry('AI_TOKENS', usages[0], plan?.monthlyAITokens ?? null),
        documents: entry('DOCUMENTS', usages[1], null),
        exports: entry('EXPORTS', usages[2], plan?.exportLimit ?? null),
        users: entry('ACTIVE_USERS', usages[3], plan?.maxUsers ?? null),
        courses: entry('COURSES', usages[4], plan?.maxCourses ?? null),
      },
    }
  },

  async getUsageHistory(institutionId: string, metric?: UsageMetricType, limit = 30) {
    return prisma.usageRecord.findMany({
      where: { institutionId, ...(metric ? { metric } : {}) },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    })
  },

  async aggregateAllInstitutions() {
    const institutions = await prisma.institution.findMany({ select: { id: true } })
    let processed = 0
    for (const inst of institutions) {
      try {
        const userCount = await prisma.user.count({ where: { institutionId: inst.id, status: 'ACTIVE' } })
        const courseCount = await prisma.course.count({ where: { institutionId: inst.id, active: true } })
        await this.recordUsage(inst.id, 'ACTIVE_USERS', userCount)
        await this.recordUsage(inst.id, 'COURSES', courseCount)
        processed++
      } catch (err) {
        logger.warn(`Usage aggregation failed for ${inst.id}`, { err })
      }
    }
    return processed
  },
}
