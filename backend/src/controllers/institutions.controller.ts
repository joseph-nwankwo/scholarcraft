import type { Request, Response } from 'express'
import { prisma } from '../config/database'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { auditService } from '../services/audit/audit.service'

export const institutionsController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId
    if (!institutionId) throw AppError.forbidden('Not part of an institution')

    const institution = await prisma.institution.findUnique({
      where: { id: institutionId },
      select: {
        id: true, name: true, abbreviation: true, domain: true, logo: true,
        institutionType: true,
        contactEmail: true, contactPhone: true, website: true,
        address: true, city: true, state: true, country: true, timezone: true,
        planTier: true, tenantStatus: true,
        maxUsers: true, maxCourses: true, storageLimitGb: true,
        isActive: true, createdAt: true, updatedAt: true,
        _count: { select: { users: true, courses: true } },
      },
    })
    if (!institution) throw AppError.notFound('Institution')

    res.json({ status: 'success', institution })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const {
      name, abbreviation, contactEmail, contactPhone, website,
      address, city, state, country, timezone, logo, institutionType,
    } = req.body as Record<string, string | undefined>

    const old = await prisma.institution.findUnique({ where: { id: institutionId } })

    const institution = await prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(name            !== undefined && { name }),
        ...(abbreviation    !== undefined && { abbreviation }),
        ...(institutionType !== undefined && { institutionType: institutionType as import('@prisma/client').InstitutionType }),
        ...(contactEmail    !== undefined && { contactEmail }),
        ...(contactPhone    !== undefined && { contactPhone }),
        ...(website         !== undefined && { website }),
        ...(address         !== undefined && { address }),
        ...(city            !== undefined && { city }),
        ...(state           !== undefined && { state }),
        ...(country         !== undefined && { country }),
        ...(timezone        !== undefined && { timezone }),
        ...(logo            !== undefined && { logo }),
      },
      select: {
        id: true, name: true, abbreviation: true, domain: true, logo: true,
        institutionType: true,
        contactEmail: true, contactPhone: true, website: true,
        address: true, city: true, state: true, country: true, timezone: true,
        planTier: true, tenantStatus: true,
        maxUsers: true, maxCourses: true, storageLimitGb: true,
        isActive: true, updatedAt: true,
      },
    })

    await auditService.log({
      userId:        req.user!.userId,
      institutionId,
      action:        'institution.updated',
      resource:      'institution',
      resourceId:    institutionId,
      oldValue:      old as unknown as object,
      newValue:      institution as unknown as object,
    })

    res.json({ status: 'success', institution })
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!

    const [userCount, courseCount, documentCount, aiCount] = await Promise.all([
      prisma.user.count({ where: { institutionId } }),
      prisma.course.count({ where: { institutionId } }),
      prisma.document.count({ where: { user: { institutionId } } }),
      prisma.aIGeneration.count({ where: { user: { institutionId } } }),
    ])

    res.json({ status: 'success', stats: { userCount, courseCount, documentCount, aiCount } })
  }),

  getAuditLogs: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const { auditService: audit } = await import('../services/audit/audit.service')
    const page   = parseInt(typeof req.query.page   === 'string' ? req.query.page   : '1')
    const limit  = parseInt(typeof req.query.limit  === 'string' ? req.query.limit  : '50')
    const result = await audit.list(institutionId, { page, limit })
    res.json({ status: 'success', ...result })
  }),
}
