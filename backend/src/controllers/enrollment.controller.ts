import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { enrollmentService } from '../services/enrollment/enrollment.service'

export const enrollmentController = {
  enroll: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const { courseId, academicSessionId } = req.body as { courseId: string; academicSessionId?: string }
    if (!courseId) throw AppError.badRequest('courseId is required')

    const enrollment = await enrollmentService.enroll(studentId, courseId, academicSessionId)
    res.status(201).json({ status: 'success', data: enrollment })
  }),

  drop: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const { courseId } = req.params as { courseId: string }

    await enrollmentService.drop(studentId, courseId)
    res.json({ status: 'success', message: 'Dropped course successfully' })
  }),

  getMyEnrollments: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const data = await enrollmentService.getMyEnrollments(studentId)
    res.json({ status: 'success', data })
  }),

  getCourseStudents: asyncHandler(async (req: Request, res: Response) => {
    const { courseId } = req.params as { courseId: string }
    const data = await enrollmentService.getCourseStudents(courseId)
    res.json({ status: 'success', data })
  }),

  getAvailableCourses: asyncHandler(async (req: Request, res: Response) => {
    const studentId     = req.user!.userId
    let institutionId   = req.user!.institutionId

    // If the token doesn't carry an institutionId, look it up from the DB
    if (!institutionId) {
      const { prisma } = await import('../config/database')
      const user = await prisma.user.findUnique({ where: { id: studentId }, select: { institutionId: true } })
      institutionId = user?.institutionId ?? null
    }

    const data = await enrollmentService.getAvailableCourses(institutionId, studentId)
    res.json({ status: 'success', data })
  }),
}
