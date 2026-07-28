import { addDays, addMonths, addYears } from 'date-fns'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { logger } from '../../utils/logger'
import type { BillingStatus, PlanTier } from '@prisma/client'

const SLUG_TO_TIER: Record<string, PlanTier> = {
  free: 'FREE', starter: 'STARTER', professional: 'PROFESSIONAL', enterprise: 'ENTERPRISE',
}

function periodEnd(billingCycle: string, from: Date): Date {
  return billingCycle === 'YEARLY' ? addYears(from, 1) : addMonths(from, 1)
}

export const subscriptionService = {
  async getPlans() {
    return prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      include: { featureFlags: true },
    })
  },

  async getPlan(idOrSlug: string) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { featureFlags: true },
    })
    if (!plan) throw AppError.notFound('Plan')
    return plan
  },

  async getInstitutionSubscription(institutionId: string) {
    return prisma.institutionSubscription.findUnique({
      where: { institutionId },
      include: { plan: { include: { featureFlags: true } }, coupon: true },
    })
  },

  async createSubscription(institutionId: string, planId: string, opts?: {
    couponCode?: string; trialDays?: number; autoRenew?: boolean
  }) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) throw AppError.notFound('Plan')

    const existing = await prisma.institutionSubscription.findUnique({ where: { institutionId } })
    if (existing) throw AppError.conflict('Institution already has an active subscription')

    let couponId: string | undefined
    let discountedAmount = Number(plan.price)

    if (opts?.couponCode) {
      const coupon = await prisma.coupon.findFirst({
        where: { code: opts.couponCode, active: true },
      })
      if (coupon) {
        if (coupon.expirationDate && coupon.expirationDate < new Date()) {
          throw AppError.badRequest('Coupon has expired')
        }
        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
          throw AppError.badRequest('Coupon usage limit reached')
        }
        couponId = coupon.id
        discountedAmount = coupon.discountType === 'PERCENTAGE'
          ? discountedAmount * (1 - Number(coupon.discountValue) / 100)
          : Math.max(0, discountedAmount - Number(coupon.discountValue))
        await prisma.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } })
        await prisma.couponRedemption.create({ data: { couponId: coupon.id, institutionId } })
      }
    }

    const trialDays = opts?.trialDays ?? (Number(plan.price) === 0 ? 0 : 14)
    const now = new Date()
    const trialEndsAt = trialDays > 0 ? addDays(now, trialDays) : undefined
    const end = periodEnd(plan.billingCycle, trialEndsAt ?? now)
    const status: BillingStatus = trialDays > 0 ? 'TRIALING' : 'ACTIVE'

    const subscription = await prisma.institutionSubscription.create({
      data: {
        institutionId,
        planId,
        status,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        trialEndsAt,
        autoRenew: opts?.autoRenew ?? true,
        couponId,
      },
      include: { plan: true },
    })

    await syncInstitutionTier(institutionId, plan.slug)

    if (status === 'ACTIVE' && discountedAmount > 0) {
      const { invoiceService } = await import('./invoice.service')
      await invoiceService.generateInvoice(subscription.id, {
        amount: discountedAmount, currency: plan.currency, dueDate: addDays(now, 7),
        notes: couponId ? 'Coupon discount applied' : undefined,
      })
    }

    return subscription
  },

  async upgradeSubscription(institutionId: string, newPlanId: string, opts?: { prorate?: boolean }) {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, include: { plan: true },
    })
    if (!sub) throw AppError.notFound('Subscription')

    const newPlan = await prisma.subscriptionPlan.findUnique({ where: { id: newPlanId } })
    if (!newPlan) throw AppError.notFound('New plan')

    const now = new Date()
    let invoiceAmount = Number(newPlan.price)

    if (opts?.prorate && sub.status === 'ACTIVE') {
      const totalMs = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()
      const usedMs = now.getTime() - sub.currentPeriodStart.getTime()
      const remainingFraction = Math.max(0, 1 - usedMs / totalMs)
      const credit = Number(sub.plan.price) * remainingFraction
      invoiceAmount = Math.max(0, invoiceAmount - credit)
    }

    const end = periodEnd(newPlan.billingCycle, now)

    const updated = await prisma.institutionSubscription.update({
      where: { institutionId },
      data: { planId: newPlanId, currentPeriodStart: now, currentPeriodEnd: end, status: 'ACTIVE' },
      include: { plan: true },
    })

    await syncInstitutionTier(institutionId, newPlan.slug)

    if (invoiceAmount > 0) {
      const { invoiceService } = await import('./invoice.service')
      await invoiceService.generateInvoice(updated.id, {
        amount: invoiceAmount, currency: newPlan.currency, dueDate: addDays(now, 7),
        notes: opts?.prorate ? 'Prorated upgrade invoice' : 'Plan upgrade',
      })
    }

    return updated
  },

  async cancelSubscription(institutionId: string, immediate = false) {
    const sub = await prisma.institutionSubscription.findUnique({ where: { institutionId } })
    if (!sub) throw AppError.notFound('Subscription')
    if (sub.status === 'CANCELLED') throw AppError.badRequest('Subscription is already cancelled')

    return prisma.institutionSubscription.update({
      where: { institutionId },
      data: {
        status: immediate ? 'CANCELLED' : sub.status,
        cancelledAt: new Date(),
        autoRenew: false,
        endDate: immediate ? new Date() : sub.currentPeriodEnd,
      },
      include: { plan: true },
    })
  },

  async resumeSubscription(institutionId: string) {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, include: { plan: true },
    })
    if (!sub) throw AppError.notFound('Subscription')
    if (sub.status !== 'CANCELLED' && sub.status !== 'PAUSED') {
      throw AppError.badRequest('Subscription is not cancelled or paused')
    }

    const now = new Date()
    const end = periodEnd(sub.plan.billingCycle, now)

    return prisma.institutionSubscription.update({
      where: { institutionId },
      data: {
        status: 'ACTIVE', cancelledAt: null, autoRenew: true,
        endDate: null, currentPeriodStart: now, currentPeriodEnd: end,
      },
      include: { plan: true },
    })
  },

  async renewSubscription(institutionId: string) {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, include: { plan: true },
    })
    if (!sub) throw AppError.notFound('Subscription')

    const now = new Date()
    const end = periodEnd(sub.plan.billingCycle, now)

    const updated = await prisma.institutionSubscription.update({
      where: { institutionId },
      data: { status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: end, renewalDate: end },
      include: { plan: true },
    })

    if (Number(sub.plan.price) > 0) {
      const { invoiceService } = await import('./invoice.service')
      await invoiceService.generateInvoice(updated.id, {
        amount: Number(sub.plan.price), currency: sub.plan.currency,
        dueDate: addDays(now, 7), notes: 'Subscription renewal',
      })
    }

    return updated
  },

  async getSubscriptionStats() {
    const [total, byStatus, trialing, activeRows] = await Promise.all([
      prisma.institutionSubscription.count(),
      prisma.institutionSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.institutionSubscription.count({ where: { status: 'TRIALING' } }),
      prisma.institutionSubscription.findMany({ where: { status: 'ACTIVE' }, include: { plan: true } }),
    ])

    const mrr = activeRows.reduce((sum, s) => {
      const monthly = s.plan.billingCycle === 'MONTHLY'
        ? Number(s.plan.price)
        : Number(s.plan.price) / 12
      return sum + monthly
    }, 0)

    return {
      total,
      trialing,
      active: activeRows.length,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    }
  },

  async getAllSubscriptions(opts?: { page?: number; limit?: number; status?: string }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const where = opts?.status ? { status: opts.status as BillingStatus } : {}

    const [items, total] = await Promise.all([
      prisma.institutionSubscription.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { institution: { select: { id: true, name: true } }, plan: true },
      }),
      prisma.institutionSubscription.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  // Called by BullMQ worker or cron to expire trials & process renewals
  async processExpiredTrials() {
    const now = new Date()
    const expired = await prisma.institutionSubscription.findMany({
      where: { status: 'TRIALING', trialEndsAt: { lte: now } },
    })
    for (const sub of expired) {
      await prisma.institutionSubscription.update({
        where: { id: sub.id },
        data: { status: 'PAST_DUE' },
      })
      logger.info(`Trial expired: ${sub.institutionId}`)
    }
    return expired.length
  },
}

async function syncInstitutionTier(institutionId: string, slug: string) {
  const tier = (SLUG_TO_TIER[slug.toLowerCase()] ?? 'FREE') as PlanTier
  await prisma.institution.update({ where: { id: institutionId }, data: { planTier: tier } })
}
