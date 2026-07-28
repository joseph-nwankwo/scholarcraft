import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { couponService } from '../../services/billing/coupon.service'

export const couponsController = {
  validate: asyncHandler(async (req, res) => {
    const code = req.params.code as string
    const institutionId = req.user?.institutionId ?? undefined
    const coupon = await couponService.validateCoupon(code, institutionId)
    res.json({ success: true, data: coupon })
  }) as RequestHandler,

  // Admin endpoints
  list: asyncHandler(async (req, res) => {
    const { page, limit, active } = req.query as Record<string, string>
    const result = await couponService.getCoupons({
      page: Number(page), limit: Number(limit),
      active: active !== undefined ? active === 'true' : undefined,
    })
    res.json({ success: true, ...result })
  }) as RequestHandler,

  create: asyncHandler(async (req, res) => {
    const coupon = await couponService.createCoupon({
      ...req.body,
      expirationDate: req.body.expirationDate ? new Date(req.body.expirationDate) : undefined,
    })
    res.status(201).json({ success: true, data: coupon })
  }) as RequestHandler,

  revoke: asyncHandler(async (req, res) => {
    const coupon = await couponService.revokeCoupon(req.params.id as string)
    res.json({ success: true, data: coupon })
  }) as RequestHandler,

  stats: asyncHandler(async (req, res) => {
    const result = await couponService.getCouponStats(req.params.id as string)
    res.json({ success: true, data: result })
  }) as RequestHandler,
}
