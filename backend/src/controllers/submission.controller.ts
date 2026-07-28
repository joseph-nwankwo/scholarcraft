import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { submissionService } from '../services/submission/submission.service'

export const submissionController = {
  // Student: get or start a submission for an assignment
  getSubmission: asyncHandler(async (req: Request, res: Response) => {
    const studentId    = req.user!.userId
    const assessmentId = String(req.params.assessmentId)
    const data = await submissionService.getSubmission(studentId, assessmentId)
    res.json({ status: 'success', data })
  }),

  // Student: save draft (text + optional file)
  saveDraft: asyncHandler(async (req: Request, res: Response) => {
    const studentId    = req.user!.userId
    const assessmentId = String(req.params.assessmentId)
    const { content }  = req.body as { content?: string }
    const file         = req.file

    const data = await submissionService.saveDraft(studentId, assessmentId, content, file)
    res.json({ status: 'success', data })
  }),

  // Student: finalise submission
  submit: asyncHandler(async (req: Request, res: Response) => {
    const studentId    = req.user!.userId
    const assessmentId = String(req.params.assessmentId)

    const data = await submissionService.submit(studentId, assessmentId)
    res.json({ status: 'success', data })
  }),

  // Student: list all own submissions
  getMySubmissions: asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId
    const data = await submissionService.getMySubmissions(studentId)
    res.json({ status: 'success', data })
  }),

  // Lecturer: list all submissions for an assignment
  getAssignmentSubmissions: asyncHandler(async (req: Request, res: Response) => {
    const lecturerId   = req.user!.userId
    const assessmentId = String(req.params.assessmentId)

    const data = await submissionService.getAssignmentSubmissions(assessmentId, lecturerId)
    res.json({ status: 'success', data })
  }),

  // Lecturer: grade a submission
  grade: asyncHandler(async (req: Request, res: Response) => {
    const graderId      = req.user!.userId
    const submissionId  = String(req.params.id)
    const { grade, feedback } = req.body as { grade: number; feedback?: string }

    if (grade === undefined) throw AppError.badRequest('grade is required')

    const data = await submissionService.grade(submissionId, graderId, Number(grade), feedback)
    res.json({ status: 'success', data })
  }),

  // Lecturer: return submission with feedback (no grade)
  returnSubmission: asyncHandler(async (req: Request, res: Response) => {
    const submissionId = String(req.params.id)
    const { feedback } = req.body as { feedback: string }
    if (!feedback) throw AppError.badRequest('feedback is required')

    const data = await submissionService.returnSubmission(submissionId, feedback)
    res.json({ status: 'success', data })
  }),
}
