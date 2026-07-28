import { PrismaClient } from '@prisma/client'
import { featureFlagService } from '../src/services/billing/feature-flag.service'

const prisma = new PrismaClient()

const plans = [
  {
    name: 'Free',
    slug: 'free',
    billingCycle: 'MONTHLY' as const,
    price: 0,
    currency: 'USD',
    maxUsers: 2,
    maxCourses: 2,
    maxStorageGB: 1,
    monthlyAITokens: 50000,
    monthlyGenerations: 500,
    exportLimit: 5,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    ssoEnabled: false,
    sortOrder: 1,
    description: 'Perfect for individual lecturers getting started',
  },
  {
    name: 'Starter',
    slug: 'starter',
    billingCycle: 'MONTHLY' as const,
    price: 29,
    currency: 'USD',
    maxUsers: 10,
    maxCourses: 20,
    maxStorageGB: 10,
    monthlyAITokens: 500000,
    monthlyGenerations: 5000,
    exportLimit: 100,
    apiAccess: false,
    prioritySupport: false,
    customBranding: false,
    ssoEnabled: false,
    sortOrder: 2,
    description: 'For small departments and growing teams',
  },
  {
    name: 'Professional',
    slug: 'professional',
    billingCycle: 'MONTHLY' as const,
    price: 99,
    currency: 'USD',
    maxUsers: 50,
    maxCourses: null,
    maxStorageGB: 50,
    monthlyAITokens: 2000000,
    monthlyGenerations: 20000,
    exportLimit: 1000,
    apiAccess: true,
    prioritySupport: true,
    customBranding: false,
    ssoEnabled: false,
    sortOrder: 3,
    description: 'For departments with unlimited courses and API access',
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    billingCycle: 'MONTHLY' as const,
    price: 299,
    currency: 'USD',
    maxUsers: null,
    maxCourses: null,
    maxStorageGB: null,
    monthlyAITokens: null,
    monthlyGenerations: null,
    exportLimit: null,
    apiAccess: true,
    prioritySupport: true,
    customBranding: true,
    ssoEnabled: true,
    sortOrder: 4,
    description: 'Unlimited everything — SSO, custom branding, dedicated support',
  },
]

async function main() {
  console.log('🌱 Seeding subscription plans...')

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    })
    console.log(`  ✅ Plan: ${plan.name} ($${plan.price}/mo)`)
  }

  console.log('🚩 Seeding default feature flags...')
  await featureFlagService.seedDefaultFlags()
  console.log('  ✅ Feature flags seeded')

  console.log('\n✨ Seed complete!')
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
