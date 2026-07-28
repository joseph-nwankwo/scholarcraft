import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { insightsService } from '../services/analytics/insights.service'

export const insightsController = {
  // GET /api/insights/lecturer
  lecturerInsights: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const data = await insightsService.generateLecturerInsights(userId, institutionId)
    res.json({ data })
  }),

  // GET /api/insights/institution
  institutionInsights: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId, role } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    if (role !== 'UNIVERSITY_ADMIN' && role !== 'ADMINISTRATOR' && role !== 'DEAN') {
      throw AppError.forbidden('Insufficient role')
    }
    const data = await insightsService.generateInstitutionInsights(institutionId)
    res.json({ data })
  }),

  // GET /api/insights/bloom
  bloomInsights: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'
    const data = await insightsService.generateBloomInsights({
      userId: isAdmin ? undefined : userId,
      institutionId: institutionId ?? undefined,
      courseId: req.query.courseId as string | undefined,
    })
    res.json({ data })
  }),

  // GET /api/insights/assessment
  assessmentInsights: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR' || role === 'DEPARTMENT_HEAD' || role === 'DEAN'
    const data = await insightsService.generateAssessmentInsights({
      userId: isAdmin ? undefined : userId,
      institutionId: institutionId ?? undefined,
    })
    res.json({ data })
  }),
}
