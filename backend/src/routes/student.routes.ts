import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { prisma } from '../config/database'
import type { Request, Response } from 'express'

const router = Router()

// Student dashboard — upcoming assignments + recent grades + summary
router.get('/dashboard', authenticate, authorize('STUDENT'), asyncHandler(async (req: Request, res: Response) => {
  const studentId = req.user!.userId

  const [enrollments, submissions] = await Promise.all([
    prisma.courseEnrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { courseId: true, course: { select: { id: true, title: true, code: true } } },
    }),
    prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        assessment: {
          select: { id: true, title: true, dueDate: true, totalMarks: true,
            course: { select: { title: true, code: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
  ])

  const courseIds = enrollments.map((e) => e.courseId)
  const submittedIds = new Set(submissions.map((s) => s.assessmentId))

  const pendingAssignments = await prisma.assessment.findMany({
    where: {
      courseId: { in: courseIds },
      type: 'ASSIGNMENT',
      status: 'PUBLISHED',
      id: { notIn: [...submittedIds] },
    },
    select: { id: true, title: true, dueDate: true, totalMarks: true,
      course: { select: { title: true, code: true } } },
    orderBy: { dueDate: 'asc' },
  })

  const graded = submissions.filter((s) => s.status === 'GRADED')
  const totalGraded = graded.length
  const avgGrade = totalGraded > 0
    ? graded.reduce((sum, s) => sum + (s.grade ?? 0), 0) / totalGraded
    : null

  res.json({
    status: 'success',
    data: {
      enrolledCourses:    enrollments.length,
      pendingAssignments,
      recentSubmissions:  submissions.slice(0, 5),
      stats: { totalSubmissions: submissions.length, totalGraded, avgGrade },
    },
  })
}))

export default router
