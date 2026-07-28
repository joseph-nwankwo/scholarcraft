import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { reportService } from '../services/analytics/report.service'

function parseRange(from?: string, to?: string) {
  const f = from ? new Date(from) : new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  const t = to ? new Date(to) : new Date()
  return { from: f, to: t }
}

export const reportsController = {
  // ── Templates ─────────────────────────────────────────────────────
  listTemplates: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const data = await reportService.listTemplates(institutionId, userId)
    res.json({ data })
  }),

  createTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const data = await reportService.createTemplate(userId, institutionId, req.body)
    res.status(201).json({ data })
  }),

  deleteTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!
    await reportService.deleteTemplate(req.params.id as string, userId)
    res.json({ ok: true })
  }),

  // ── Scheduled Reports ─────────────────────────────────────────────
  listScheduled: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const data = await reportService.listScheduled(userId, institutionId)
    res.json({ data })
  }),

  createScheduled: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const data = await reportService.createScheduled(userId, institutionId, req.body)
    res.status(201).json({ data })
  }),

  updateScheduled: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!
    const data = await reportService.updateScheduled(req.params.id as string, userId, req.body)
    res.json({ data })
  }),

  deleteScheduled: asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!
    await reportService.deleteScheduled(req.params.id as string, userId)
    res.json({ ok: true })
  }),

  // ── Report Generation ─────────────────────────────────────────────
  generateTeaching: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const fmt = (req.query.format as string) === 'csv' ? 'csv' : 'pdf'
    const range = parseRange(req.query.from as string, req.query.to as string)
    const { buffer, mimeType, filename } = await reportService.generateTeachingReport({
      userId, institutionId, range, format: fmt,
    })
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }),

  generateAssessment: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId } = req.user!
    const fmt = (req.query.format as string) === 'csv' ? 'csv' : 'pdf'
    const { buffer, mimeType, filename } = await reportService.generateAssessmentReport({
      userId, institutionId, format: fmt,
    })
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }),

  generateAI: asyncHandler(async (req: Request, res: Response) => {
    const { userId, institutionId, role } = req.user!
    const fmt = (req.query.format as string) === 'csv' ? 'csv' : 'pdf'
    const isAdmin = role === 'UNIVERSITY_ADMIN' || role === 'ADMINISTRATOR'
    const range = parseRange(req.query.from as string, req.query.to as string)
    const { buffer, mimeType, filename } = await reportService.generateAIReport({
      userId: isAdmin ? undefined : userId,
      institutionId,
      range,
      format: fmt,
    })
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }),

  generateInstitution: asyncHandler(async (req: Request, res: Response) => {
    const { institutionId, role } = req.user!
    if (!institutionId) throw AppError.forbidden('Institution required')
    if (role !== 'UNIVERSITY_ADMIN' && role !== 'ADMINISTRATOR' && role !== 'DEAN' && role !== 'DEPARTMENT_HEAD') {
      throw AppError.forbidden('Insufficient role')
    }
    const fmt = (req.query.format as string) === 'csv' ? 'csv' : 'pdf'
    const { buffer, mimeType, filename } = await reportService.generateInstitutionReport({
      institutionId, format: fmt,
    })
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  }),
}
