import path from 'path'
import fs from 'fs'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

export const submissionService = {
  async getOrCreate(studentId: string, assessmentId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, type: true, status: true, courseId: true, dueDate: true, allowLate: true, title: true },
    })
    if (!assessment) throw AppError.notFound('Assignment not found')
    if (assessment.type !== 'ASSIGNMENT') throw AppError.badRequest('Not an assignment')
    if (assessment.status !== 'PUBLISHED') throw AppError.badRequest('Assignment is not published')

    // Check enrollment
    if (assessment.courseId) {
      const enrolled = await prisma.courseEnrollment.findFirst({
        where: { studentId, courseId: assessment.courseId, status: 'ACTIVE' },
      })
      if (!enrolled) throw AppError.forbidden('Not enrolled in this course')
    }

    const existing = await prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
    })
    if (existing) return existing

    return prisma.assignmentSubmission.create({
      data: { studentId, assessmentId, courseId: assessment.courseId ?? null },
    })
  },

  async saveDraft(studentId: string, assessmentId: string, content?: string, file?: Express.Multer.File) {
    const submission = await submissionService.getOrCreate(studentId, assessmentId)

    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw AppError.badRequest('Cannot edit a submitted submission')
    }

    // Delete old file if replacing
    if (file && submission.fileUrl) {
      const oldPath = path.join(process.cwd(), submission.fileUrl)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content
    if (file) {
      const uploadDir = path.join(process.cwd(), 'uploads', 'submissions')
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

      const ext = path.extname(file.originalname)
      const filename = `${submission.id}${ext}`
      const filePath = path.join(uploadDir, filename)
      fs.writeFileSync(filePath, file.buffer)

      updateData.fileUrl  = `/uploads/submissions/${filename}`
      updateData.fileName = file.originalname
      updateData.fileSize = file.size
      updateData.fileType = file.mimetype
    }

    return prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: updateData,
    })
  },

  async submit(studentId: string, assessmentId: string) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
      include: { assessment: { select: { dueDate: true, allowLate: true } } },
    })
    if (!submission) throw AppError.notFound('No draft found — save a draft first')
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED') {
      throw AppError.badRequest('Already submitted')
    }
    if (!submission.content && !submission.fileUrl) {
      throw AppError.badRequest('Submission has no content or file')
    }

    const now = new Date()
    const dueDate = submission.assessment.dueDate
    const isLate  = dueDate && now > dueDate

    if (isLate && !submission.assessment.allowLate) {
      throw AppError.badRequest('Submission deadline has passed')
    }

    return prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status:      isLate ? 'LATE' : 'SUBMITTED',
        submittedAt: now,
      },
    })
  },

  async getMySubmissions(studentId: string) {
    return prisma.assignmentSubmission.findMany({
      where: { studentId },
      include: {
        assessment: {
          select: { id: true, title: true, dueDate: true, totalMarks: true, courseId: true,
            course: { select: { title: true, code: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
  },

  async getSubmission(studentId: string, assessmentId: string) {
    // Create draft if none exists so the page always has assessment details
    await submissionService.getOrCreate(studentId, assessmentId)

    return prisma.assignmentSubmission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId } },
      include: {
        assessment: {
          select: { id: true, title: true, description: true, instructions: true,
            dueDate: true, openDate: true, totalMarks: true, allowLate: true,
            course: { select: { id: true, title: true, code: true } } },
        },
      },
    })
  },

  // ── Lecturer endpoints ──────────────────────────────────────────

  async getAssignmentSubmissions(assessmentId: string, lecturerId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: { createdBy: true, courseId: true },
    })
    if (!assessment) throw AppError.notFound('Assignment not found')
    if (assessment.createdBy !== lecturerId) {
      // Allow HODs/deans/admins — they pass with authorize() guard
    }

    return prisma.assignmentSubmission.findMany({
      where: { assessmentId },
      include: {
        student: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { submittedAt: 'asc' },
    })
  },

  async grade(submissionId: string, graderId: string, grade: number, feedback?: string) {
    const sub = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assessment: { select: { totalMarks: true } } },
    })
    if (!sub) throw AppError.notFound('Submission not found')
    if (sub.status === 'DRAFT') throw AppError.badRequest('Cannot grade an unsubmitted draft')
    if (grade < 0 || grade > sub.assessment.totalMarks) {
      throw AppError.badRequest(`Grade must be between 0 and ${sub.assessment.totalMarks}`)
    }

    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { grade, feedback: feedback ?? null, gradedBy: graderId, gradedAt: new Date(), status: 'GRADED' },
    })
  },

  async returnSubmission(submissionId: string, feedback: string) {
    const sub = await prisma.assignmentSubmission.findUnique({ where: { id: submissionId } })
    if (!sub) throw AppError.notFound('Submission not found')

    return prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { status: 'RETURNED', feedback },
    })
  },
}
