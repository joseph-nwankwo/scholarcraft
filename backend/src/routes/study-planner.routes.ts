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

const SUBJECT_SELECT = { id: true, name: true, color: true, description: true, createdAt: true, updatedAt: true }
const TASK_INCLUDE   = { subject: { select: SUBJECT_SELECT } }
const SESSION_INCLUDE = {
  subject: { select: { id: true, name: true, color: true } },
  task:    { select: { id: true, title: true } },
}

// ── Subjects ──────────────────────────────────────────────────────────────────

const subjectCreateSchema = z.object({
  name:        z.string().trim().min(1).max(100),
  color:       z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().trim().max(500).optional(),
})
const subjectUpdateSchema = subjectCreateSchema.partial()

router.get('/subjects', asyncHandler(async (req: Request, res: Response) => {
  const subjects = await prisma.studySubject.findMany({
    where: { userId: req.user!.userId },
    select: SUBJECT_SELECT,
    orderBy: { name: 'asc' },
  })
  res.json({ status: 'success', subjects })
}))

router.post('/subjects', validate(subjectCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const subject = await prisma.studySubject.create({
    data: { ...req.body, userId: req.user!.userId },
    select: SUBJECT_SELECT,
  })
  res.status(201).json({ status: 'success', subject })
}))

router.patch('/subjects/:id', validate(subjectUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studySubject.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Subject')
  const subject = await prisma.studySubject.findUnique({ where: { id: String(req.params.id) }, select: SUBJECT_SELECT })
  res.json({ status: 'success', subject })
}))

router.delete('/subjects/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studySubject.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Subject')
  res.json({ status: 'success', message: 'Subject deleted' })
}))

// ── Tasks ─────────────────────────────────────────────────────────────────────

const taskCreateSchema = z.object({
  title:       z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  subjectId:   z.string().nullable().optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate:     z.string().datetime().nullable().optional(),
  reminderMinutesBefore: z.number().int().min(0).max(43_200).nullable().optional(),
})
const taskUpdateSchema = taskCreateSchema.partial().extend({
  completed: z.boolean().optional(),
})

router.get('/tasks', asyncHandler(async (req: Request, res: Response) => {
  const tasks = await prisma.studyTask.findMany({
    where: { userId: req.user!.userId },
    include: TASK_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ status: 'success', tasks })
}))

router.post('/tasks', validate(taskCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { dueDate, ...rest } = req.body
  const task = await prisma.studyTask.create({
    data: { ...rest, dueDate: dueDate ? new Date(dueDate) : null, userId: req.user!.userId },
    include: TASK_INCLUDE,
  })
  res.status(201).json({ status: 'success', task })
}))

router.patch('/tasks/:id', validate(taskUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { dueDate, completed, ...rest } = req.body
  const data: Record<string, unknown> = { ...rest }
  if ('dueDate' in req.body) data.dueDate = dueDate ? new Date(dueDate) : null
  if (completed !== undefined) {
    data.completed = completed
    data.completedAt = completed ? new Date() : null
  }

  const { count } = await prisma.studyTask.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data,
  })
  if (!count) throw AppError.notFound('Task')
  const task = await prisma.studyTask.findUnique({ where: { id: String(req.params.id) }, include: TASK_INCLUDE })
  res.json({ status: 'success', task })
}))

router.delete('/tasks/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studyTask.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Task')
  res.json({ status: 'success', message: 'Task deleted' })
}))

// ── Study sessions ────────────────────────────────────────────────────────────

const sessionLogSchema = z.object({
  subjectId:       z.string().nullable().optional(),
  taskId:          z.string().nullable().optional(),
  notes:           z.string().trim().max(1000).optional(),
  durationMinutes: z.number().int().min(1).max(480),
})

router.get('/sessions', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const sessions = await prisma.studySession.findMany({
    where: { userId: req.user!.userId },
    include: SESSION_INCLUDE,
    orderBy: { startTime: 'desc' },
    take: limit,
  })
  res.json({ status: 'success', sessions })
}))

router.post('/sessions', validate(sessionLogSchema), asyncHandler(async (req: Request, res: Response) => {
  const { durationMinutes, ...rest } = req.body
  const endTime   = new Date()
  const startTime = new Date(endTime.getTime() - durationMinutes * 60_000)

  const session = await prisma.studySession.create({
    data: { ...rest, userId: req.user!.userId, startTime, endTime, durationMinutes },
    include: SESSION_INCLUDE,
  })
  res.status(201).json({ status: 'success', session })
}))

router.delete('/sessions/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studySession.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Study session')
  res.json({ status: 'success', message: 'Study session deleted' })
}))

// ── Timetable ─────────────────────────────────────────────────────────────────

const TIMETABLE_INCLUDE = { subject: { select: { id: true, name: true, color: true } } }

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm')

const timetableCreateSchema = z.object({
  title:     z.string().trim().min(1).max(150),
  subjectId: z.string().nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeString,
  endTime:   timeString,
})
const timetableUpdateSchema = timetableCreateSchema.partial()

router.get('/timetable', asyncHandler(async (req: Request, res: Response) => {
  const entries = await prisma.studyTimetableEntry.findMany({
    where: { userId: req.user!.userId },
    include: TIMETABLE_INCLUDE,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
  res.json({ status: 'success', entries })
}))

router.post('/timetable', validate(timetableCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const entry = await prisma.studyTimetableEntry.create({
    data: { ...req.body, userId: req.user!.userId },
    include: TIMETABLE_INCLUDE,
  })
  res.status(201).json({ status: 'success', entry })
}))

router.patch('/timetable/:id', validate(timetableUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studyTimetableEntry.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Timetable entry')
  const entry = await prisma.studyTimetableEntry.findUnique({ where: { id: String(req.params.id) }, include: TIMETABLE_INCLUDE })
  res.json({ status: 'success', entry })
}))

router.delete('/timetable/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.studyTimetableEntry.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Timetable entry')
  res.json({ status: 'success', message: 'Timetable entry deleted' })
}))

export default router
