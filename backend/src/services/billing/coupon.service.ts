import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { DiscountType } from '@prisma/client'

export const couponService = {
  async validateCoupon(code: string, institutionId?: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), active: true },
    })
    if (!coupon) throw AppError.notFound('Coupon')
    if (coupon.expirationDate && coupon.expirationDate < new Date()) {
      throw AppError.badRequest('Coupon has expired')
    }
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw AppError.badRequest('Coupon usage limit reached')
    }
    if (institutionId) {
      const alreadyUsed = await prisma.couponRedemption.findUnique({
        where: { couponId_institutionId: { couponId: coupon.id, institutionId } },
      })
      if (alreadyUsed) throw AppError.badRequest('Coupon already used by this institution')
    }
    return coupon
  },

  calculateDiscount(coupon: { discountType: DiscountType; discountValue: number | string }, amount: number) {
    const val = Number(coupon.discountValue)
    return coupon.discountType === 'PERCENTAGE'
      ? { discountAmount: (amount * val) / 100, finalAmount: amount * (1 - val / 100) }
      : { discountAmount: Math.min(val, amount), finalAmount: Math.max(0, amount - val) }
  },

  async getCoupons(opts?: { page?: number; limit?: number; active?: boolean }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit
    const where = opts?.active !== undefined ? { active: opts.active } : {}

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.coupon.count({ where }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async createCoupon(data: {
    code: string; description?: string; discountType: DiscountType
    discountValue: number; expirationDate?: Date; usageLimit?: number
    applicablePlans?: string[]
  }) {
    const code = data.code.toUpperCase()
    const exists = await prisma.coupon.findUnique({ where: { code } })
    if (exists) throw AppError.conflict('Coupon code already exists')

    return prisma.coupon.create({
      data: {
        code,
        description: data.description,
        discountType: data.discountType,
        discountValue: data.discountValue,
        expirationDate: data.expirationDate,
        usageLimit: data.usageLimit,
        applicablePlans: data.applicablePlans ?? [],
      },
    })
  },

  async revokeCoupon(id: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id } })
    if (!coupon) throw AppError.notFound('Coupon')
    return prisma.coupon.update({ where: { id }, data: { active: false } })
  },

  async getCouponStats(id: string) {
    const [coupon, redemptions] = await Promise.all([
      prisma.coupon.findUnique({ where: { id } }),
      prisma.couponRedemption.findMany({ where: { couponId: id }, orderBy: { redeemedAt: 'desc' } }),
    ])
    if (!coupon) throw AppError.notFound('Coupon')
    return { coupon, redemptions, redemptionCount: redemptions.length }
  },
}
