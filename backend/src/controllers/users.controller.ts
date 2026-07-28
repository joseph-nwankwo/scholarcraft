import type { Request, Response } from 'express'
import { prisma } from '../config/database'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { roleService } from '../services/role/role.service'
import { auditService } from '../services/audit/audit.service'
import { clearPermissionCache } from '../middleware/rbac.middleware'

const qs = (v: unknown): string | undefined =>
  typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined

export const usersController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId
    if (!institutionId) throw AppError.forbidden('Institution required')

    const page   = parseInt(qs(req.query.page)  ?? '1')
    const limit  = Math.min(parseInt(qs(req.query.limit) ?? '20'), 100)
    const search = qs(req.query.search)
    const status = qs(req.query.status)

    const where = {
      institutionId,
      ...(search ? { OR: [
        { name:  { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ]} : {}),
      ...(status ? { status: status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION' } : {}),
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, firstName: true, lastName: true, email: true,
          role: true, status: true, emailVerified: true, avatarUrl: true,
          department: true, faculty: true, title: true, lastLogin: true, createdAt: true,
          roleAssignments: {
            include: { role: { select: { slug: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
      }),
      prisma.user.count({ where }),
    ])

    res.json({ status: 'success', users, total, page, totalPages: Math.ceil(total / limit) })
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId
    const userId = String(req.params.userId)

    const user = await prisma.user.findFirst({
      where: { id: userId, institutionId },
      select: {
        id: true, name: true, firstName: true, lastName: true, email: true,
        role: true, status: true, emailVerified: true, avatarUrl: true,
        department: true, faculty: true, title: true, bio: true,
        lastLogin: true, createdAt: true,
        roleAssignments: { include: { role: { select: { slug: true, name: true } } } },
      },
    })
    if (!user) throw AppError.notFound('User')

    res.json({ status: 'success', user })
  }),

  updateRole: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const userId   = String(req.params.userId)
    const { roleSlug } = req.body as { roleSlug: string }

    // Prevent changing owner's role by non-owners
    const targetUser = await prisma.user.findFirst({ where: { id: userId, institutionId } })
    if (!targetUser) throw AppError.notFound('User')

    // Remove existing role assignments for this institution
    const existingRoles = await prisma.role.findMany({ where: { institutionId } })
    const existingRoleIds = existingRoles.map((r) => r.id)
    await prisma.userRoleAssignment.deleteMany({
      where: { userId, roleId: { in: existingRoleIds } },
    })

    await roleService.assignRole(userId, institutionId, roleSlug, req.user!.userId)
    clearPermissionCache(userId)

    await auditService.log({
      userId: req.user!.userId,
      institutionId,
      action: 'user.role_changed',
      resourceId: userId,
      newValue: { roleSlug },
    })

    res.json({ status: 'success', message: 'Role updated' })
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const userId = String(req.params.userId)
    const { status } = req.body as { status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' }

    const user = await prisma.user.findFirst({ where: { id: userId, institutionId } })
    if (!user) throw AppError.notFound('User')
    if (user.id === req.user!.userId) throw AppError.badRequest('Cannot change your own status')

    await prisma.user.update({ where: { id: userId }, data: { status } })
    await auditService.log({
      userId: req.user!.userId,
      institutionId,
      action: status === 'SUSPENDED' ? 'user.suspended' : 'user.updated',
      resourceId: userId,
      newValue: { status },
    })

    res.json({ status: 'success', message: `User ${status.toLowerCase()}` })
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const userId = String(req.params.userId)

    const user = await prisma.user.findFirst({ where: { id: userId, institutionId } })
    if (!user) throw AppError.notFound('User')
    if (user.id === req.user!.userId) throw AppError.badRequest('Cannot delete your own account')

    await prisma.user.update({ where: { id: userId }, data: { status: 'INACTIVE', institutionId: null } })
    clearPermissionCache(userId)

    await auditService.log({
      userId: req.user!.userId,
      institutionId,
      action: 'user.deleted',
      resourceId: userId,
    })

    res.json({ status: 'success', message: 'User removed from institution' })
  }),

  listRoles: asyncHandler(async (req: Request, res: Response) => {
    const institutionId = req.user!.institutionId!
    const roles = await roleService.listRoles(institutionId)
    res.json({ status: 'success', roles })
  }),

  listPermissions: asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await roleService.listPermissions()
    res.json({ status: 'success', permissions })
  }),
}
