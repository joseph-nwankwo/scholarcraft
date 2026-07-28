import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'

const router = Router()
router.use(authenticate)

const COURSE_SELECT = { id: true, name: true, creditUnits: true, score: true, passMark: true, createdAt: true, updatedAt: true }
const SEMESTER_INCLUDE = { courses: { select: COURSE_SELECT, orderBy: { createdAt: 'asc' as const } } }

// ── Semesters ─────────────────────────────────────────────────────────────────

const semesterCreateSchema = z.object({
  name:    z.string().trim().min(1).max(100),
  session: z.string().trim().max(20).nullable().optional(),
})
const semesterUpdateSchema = semesterCreateSchema.partial().extend({
  order: z.number().int().optional(),
})

router.get('/semesters', asyncHandler(async (req: Request, res: Response) => {
  const semesters = await prisma.gpaSemester.findMany({
    where: { userId: req.user!.userId },
    include: SEMESTER_INCLUDE,
    orderBy: [{ session: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
  })
  res.json({ status: 'success', semesters })
}))

router.post('/semesters', validate(semesterCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const count = await prisma.gpaSemester.count({ where: { userId: req.user!.userId } })
  const semester = await prisma.gpaSemester.create({
    data: { ...req.body, order: count, userId: req.user!.userId },
    include: SEMESTER_INCLUDE,
  })
  res.status(201).json({ status: 'success', semester })
}))

router.patch('/semesters/:id', validate(semesterUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.gpaSemester.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Semester')
  const semester = await prisma.gpaSemester.findUnique({ where: { id: String(req.params.id) }, include: SEMESTER_INCLUDE })
  res.json({ status: 'success', semester })
}))

router.delete('/semesters/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.gpaSemester.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Semester')
  res.json({ status: 'success', message: 'Semester deleted' })
}))

// ── Courses ───────────────────────────────────────────────────────────────────

const courseCreateSchema = z.object({
  name:        z.string().trim().min(1).max(150),
  creditUnits: z.number().int().min(1).max(30),
  score:       z.number().int().min(0).max(100),
  passMark:    z.number().int().min(0).max(100).optional(),
})
const courseUpdateSchema = courseCreateSchema.partial()

router.post('/semesters/:id/courses', validate(courseCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const semester = await prisma.gpaSemester.findFirst({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!semester) throw AppError.notFound('Semester')

  const course = await prisma.gpaCourse.create({
    data: { ...req.body, semesterId: semester.id, userId: req.user!.userId },
    select: COURSE_SELECT,
  })
  res.status(201).json({ status: 'success', course })
}))

router.patch('/courses/:id', validate(courseUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.gpaCourse.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Course')
  const course = await prisma.gpaCourse.findUnique({ where: { id: String(req.params.id) }, select: COURSE_SELECT })
  res.json({ status: 'success', course })
}))

router.delete('/courses/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.gpaCourse.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Course')
  res.json({ status: 'success', message: 'Course deleted' })
}))

export default router
