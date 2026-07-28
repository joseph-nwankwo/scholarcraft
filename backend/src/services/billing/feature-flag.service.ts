import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

export const featureFlagService = {
  async getFlagsForPlan(planId: string) {
    return prisma.featureFlag.findMany({ where: { planId }, orderBy: { name: 'asc' } })
  },

  async getAllFlags() {
    return prisma.featureFlag.findMany({
      orderBy: [{ planId: 'asc' }, { name: 'asc' }],
      include: { plan: { select: { id: true, name: true, slug: true } } },
    })
  },

  async isFeatureEnabled(institutionId: string, featureName: string): Promise<boolean> {
    const sub = await prisma.institutionSubscription.findUnique({
      where: { institutionId }, select: { planId: true, status: true },
    })
    if (!sub || sub.status === 'EXPIRED' || sub.status === 'CANCELLED') return false

    const flag = await prisma.featureFlag.findFirst({
      where: { planId: sub.planId, name: featureName },
    })
    return flag?.enabled ?? false
  },

  async setFlag(planId: string, name: string, enabled: boolean, metadata?: Record<string, unknown>) {
    const meta = (metadata ?? {}) as Record<string, string>
    return prisma.featureFlag.upsert({
      where: { planId_name: { planId, name } },
      update: { enabled, ...(metadata ? { metadata: meta } : {}) },
      create: { planId, name, enabled, metadata: meta },
    })
  },

  async deleteFlag(planId: string, name: string) {
    const flag = await prisma.featureFlag.findFirst({ where: { planId, name } })
    if (!flag) throw AppError.notFound('Feature flag')
    return prisma.featureFlag.delete({ where: { id: flag.id } })
  },

  async seedDefaultFlags() {
    const plans = await prisma.subscriptionPlan.findMany()
    const defaultFlags: Record<string, Record<string, boolean>> = {
      free: { export_pdf: true, export_csv: false, api_access: false, custom_branding: false, sso: false, priority_support: false },
      starter: { export_pdf: true, export_csv: true, api_access: false, custom_branding: false, sso: false, priority_support: false },
      professional: { export_pdf: true, export_csv: true, api_access: true, custom_branding: false, sso: false, priority_support: true },
      enterprise: { export_pdf: true, export_csv: true, api_access: true, custom_branding: true, sso: true, priority_support: true },
    }

    for (const plan of plans) {
      const flags = defaultFlags[plan.slug] ?? {}
      for (const [name, enabled] of Object.entries(flags)) {
        await prisma.featureFlag.upsert({
          where: { planId_name: { planId: plan.id, name } },
          update: { enabled },
          create: { planId: plan.id, name, enabled },
        })
      }
    }
  },
}
