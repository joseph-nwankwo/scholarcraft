import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { WorkspaceVisibility, WorkspaceMemberRole } from '@prisma/client'

export const workspaceService = {
  async create(data: {
    institutionId: string
    ownerId: string
    name: string
    description?: string
    visibility?: WorkspaceVisibility
  }) {
    const workspace = await prisma.workspace.create({
      data: {
        institutionId: data.institutionId,
        ownerId: data.ownerId,
        name: data.name,
        description: data.description,
        visibility: data.visibility ?? 'PRIVATE',
      },
    })
    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: data.ownerId, role: 'OWNER' },
    })
    return workspace
  },

  async get(id: string) {
    const ws = await prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, conversations: true } },
      },
    })
    if (!ws) throw AppError.notFound('Workspace')
    return ws
  },

  async list(institutionId: string, userId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 20
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.workspace.findMany({
        where: {
          institutionId,
          OR: [
            { visibility: 'PUBLIC' },
            { members: { some: { userId } } },
          ],
        },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { members: true } },
          members: { where: { userId }, select: { role: true, joinedAt: true } },
        },
      }),
      prisma.workspace.count({ where: { institutionId, OR: [{ visibility: 'PUBLIC' }, { members: { some: { userId } } }] } }),
    ])

    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async update(id: string, userId: string, data: Partial<{
    name: string; description: string; visibility: WorkspaceVisibility; avatar: string
  }>) {
    await requireAdmin(id, userId)
    return prisma.workspace.update({ where: { id }, data })
  },

  async delete(id: string, userId: string) {
    const ws = await prisma.workspace.findUnique({ where: { id } })
    if (!ws) throw AppError.notFound('Workspace')
    if (ws.ownerId !== userId) throw AppError.forbidden('Only the owner can delete a workspace')
    return prisma.workspace.delete({ where: { id } })
  },

  async addMember(workspaceId: string, actorId: string, targetUserId: string, role: WorkspaceMemberRole = 'MEMBER') {
    await requireAdmin(workspaceId, actorId)
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    })
    if (existing) throw AppError.conflict('User is already a member')
    return prisma.workspaceMember.create({ data: { workspaceId, userId: targetUserId, role } })
  },

  async removeMember(workspaceId: string, actorId: string, targetUserId: string) {
    if (actorId !== targetUserId) await requireAdmin(workspaceId, actorId)
    return prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    })
  },

  async updateMemberRole(workspaceId: string, actorId: string, targetUserId: string, role: WorkspaceMemberRole) {
    await requireAdmin(workspaceId, actorId)
    return prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role },
    })
  },

  async getMembers(workspaceId: string, opts?: { page?: number; limit?: number }) {
    const page = opts?.page ?? 1
    const limit = opts?.limit ?? 50
    const skip = (page - 1) * limit

    const [items, total] = await Promise.all([
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        skip, take: limit,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, department: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
    ])
    return { items, total, page, limit, pages: Math.ceil(total / limit) }
  },

  async getDashboard(workspaceId: string) {
    const [workspace, recentActivity, upcomingEvents, memberCount] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: { owner: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.activityFeed.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      prisma.calendarEvent.findMany({
        where: { workspaceId, startAt: { gte: new Date() } },
        orderBy: { startAt: 'asc' },
        take: 5,
      }),
      prisma.workspaceMember.count({ where: { workspaceId } }),
    ])

    return { workspace, recentActivity, upcomingEvents, memberCount }
  },
}

async function requireAdmin(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
  if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
    throw AppError.forbidden('Admin or owner required')
  }
}
