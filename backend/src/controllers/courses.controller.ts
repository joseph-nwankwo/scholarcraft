import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'

const qs = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lc = () => (prisma as any).lecturerCourse as any

export const coursesController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page     = Math.max(1, parseInt(qs(req.query.page) ?? '1'))
    const pageSize = Math.min(100, parseInt(qs(req.query.pageSize) ?? '20'))
    const search   = qs(req.query.search)
    const skip     = (page - 1) * pageSize
    const createdBy = req.user!.userId

    const where = {
      createdBy,
      ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
    }

    const [courses, count] = await Promise.all([
      lc().findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take: pageSize }),
      lc().count({ where }),
    ])

    res.json({
      status: 'success',
      data: courses,
      count,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id     = String(req.params.id)
    const course = await lc().findUnique({ where: { id } })
    if (!course) throw AppError.notFound('Course')
    if (course.createdBy !== req.user!.userId) throw AppError.forbidden()
    res.json({ status: 'success', course })
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const {
      title, code, description, level, credits,
      semester, academicYear, department, faculty,
    } = req.body as {
      title: string; code?: string; description?: string; level: string
      credits?: number; semester?: string; academicYear?: string
      department?: string; faculty?: string
    }

    const course = await lc().create({
      data: {
        createdBy:    req.user!.userId,
        title,
        code:         code         || null,
        description:  description  || null,
        level,
        credits:      credits      ? Number(credits) : null,
        semester:     semester     || null,
        academicYear: academicYear || null,
        department:   department   || null,
        faculty:      faculty      || null,
      },
    })
    res.status(201).json({ status: 'success', course })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const existing = await lc().findUnique({ where: { id } })
    if (!existing) throw AppError.notFound('Course')
    if (existing.createdBy !== req.user!.userId) throw AppError.forbidden()

    const {
      title, code, description, level, credits,
      semester, academicYear, department, faculty,
    } = req.body as {
      title?: string; code?: string; description?: string; level?: string
      credits?: number; semester?: string; academicYear?: string
      department?: string; faculty?: string
    }

    const course = await lc().update({
      where: { id },
      data: {
        ...(title        !== undefined && { title }),
        ...(code         !== undefined && { code:         code         || null }),
        ...(description  !== undefined && { description:  description  || null }),
        ...(level        !== undefined && { level }),
        ...(credits      !== undefined && { credits:      credits ? Number(credits) : null }),
        ...(semester     !== undefined && { semester:     semester     || null }),
        ...(academicYear !== undefined && { academicYear: academicYear || null }),
        ...(department   !== undefined && { department:   department   || null }),
        ...(faculty      !== undefined && { faculty:      faculty      || null }),
      },
    })
    res.json({ status: 'success', course })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    const id       = String(req.params.id)
    const existing = await lc().findUnique({ where: { id } })
    if (!existing) throw AppError.notFound('Course')
    if (existing.createdBy !== req.user!.userId) throw AppError.forbidden()

    await lc().delete({ where: { id } })
    res.json({ status: 'success', message: 'Course deleted' })
  }),
}
