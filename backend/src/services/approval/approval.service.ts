import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import type { ApprovalStage } from '@prisma/client'

// Stage ordering for escalation
const STAGE_ORDER: ApprovalStage[] = ['SUBMITTED', 'PROGRAMME_COORDINATOR', 'HOD', 'DEAN', 'ADMINISTRATOR']

export const approvalService = {
  async submit(documentId: string, userId: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) throw AppError.notFound('Document')

    const existing = await prisma.approvalWorkflow.findFirst({
      where: { documentId, status: { in: ['PENDING', 'CHANGES_REQUESTED'] } },
    })
    if (existing) throw AppError.conflict('Document already has an active approval request')

    const workflow = await prisma.approvalWorkflow.create({
      data: { documentId, stage: 'SUBMITTED', status: 'PENDING' },
    })

    // Mark document as awaiting approval
    await prisma.document.update({ where: { id: documentId }, data: { status: 'GENERATED' } })

    void auditService.log({ userId, action: 'approval.submitted', resource: 'document', resourceId: documentId })
    return workflow
  },

  async getHistory(documentId: string) {
    return prisma.approvalWorkflow.findMany({
      where: { documentId },
      include: { approver: { select: { id: true, name: true, role: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getPendingForUser(approverId: string, stage?: ApprovalStage) {
    const user = await prisma.user.findUnique({ where: { id: approverId } })
    if (!user) throw AppError.notFound('User')

    // Map user role to appropriate approval stage
    const roleToStage: Record<string, ApprovalStage> = {
      LECTURER: 'SUBMITTED',
      DEPARTMENT_HEAD: 'HOD',
      DEAN: 'DEAN',
      UNIVERSITY_ADMIN: 'ADMINISTRATOR',
      ADMINISTRATOR: 'ADMINISTRATOR',
    }
    const userStage = stage ?? roleToStage[user.role] ?? 'SUBMITTED'

    return prisma.approvalWorkflow.findMany({
      where: { stage: userStage, status: 'PENDING' },
      include: {
        document: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
            course: { select: { code: true, title: true } },
          },
        },
        approver: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async approve(workflowId: string, approverId: string, comments?: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({ where: { id: workflowId } })
    if (!workflow) throw AppError.notFound('Workflow')
    if (workflow.status !== 'PENDING') throw AppError.badRequest('This workflow is not pending')

    const currentIdx = STAGE_ORDER.indexOf(workflow.stage)
    const nextStage = STAGE_ORDER[currentIdx + 1] as ApprovalStage | undefined

    // If last stage, mark document published
    if (!nextStage || nextStage === 'ADMINISTRATOR') {
      await prisma.approvalWorkflow.update({
        where: { id: workflowId },
        data: { status: 'APPROVED', approverId, comments, approvedAt: new Date() },
      })
      await prisma.document.update({ where: { id: workflow.documentId }, data: { status: 'PUBLISHED' } })
      void auditService.log({ userId: approverId, action: 'document.published', resource: 'document', resourceId: workflow.documentId })
    } else {
      // Escalate to next stage
      await prisma.approvalWorkflow.update({
        where: { id: workflowId },
        data: { status: 'APPROVED', approverId, comments, approvedAt: new Date() },
      })
      await prisma.approvalWorkflow.create({
        data: { documentId: workflow.documentId, stage: nextStage, status: 'PENDING' },
      })
    }

    void auditService.log({ userId: approverId, action: 'approval.approved', resource: 'approval', resourceId: workflowId })
  },

  async reject(workflowId: string, approverId: string, comments?: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({ where: { id: workflowId } })
    if (!workflow) throw AppError.notFound('Workflow')
    if (workflow.status !== 'PENDING') throw AppError.badRequest('This workflow is not pending')

    await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: { status: 'REJECTED', approverId, comments },
    })
    await prisma.document.update({ where: { id: workflow.documentId }, data: { status: 'DRAFT' } })
    void auditService.log({ userId: approverId, action: 'approval.rejected', resource: 'approval', resourceId: workflowId })
  },

  async requestChanges(workflowId: string, approverId: string, comments: string) {
    const workflow = await prisma.approvalWorkflow.findUnique({ where: { id: workflowId } })
    if (!workflow) throw AppError.notFound('Workflow')
    if (workflow.status !== 'PENDING') throw AppError.badRequest('This workflow is not pending')

    await prisma.approvalWorkflow.update({
      where: { id: workflowId },
      data: { status: 'CHANGES_REQUESTED', approverId, comments },
    })
    void auditService.log({ userId: approverId, action: 'approval.changes_requested', resource: 'approval', resourceId: workflowId })
  },
}
