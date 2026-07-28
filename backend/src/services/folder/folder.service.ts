import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'

export const folderService = {
  async list(userId: string, institutionId?: string, parentId?: string | null) {
    return prisma.folder.findMany({
      where: {
        createdBy: userId,
        institutionId: institutionId ?? null,
        parentId: parentId === undefined ? undefined : parentId,
      },
      include: {
        _count: { select: { children: true, documents: true } },
      },
      orderBy: { name: 'asc' },
    })
  },

  async tree(userId: string, institutionId?: string) {
    const all = await prisma.folder.findMany({
      where: { createdBy: userId, institutionId: institutionId ?? null },
      include: { _count: { select: { documents: true } } },
      orderBy: { name: 'asc' },
    })
    return buildTree(all, null)
  },

  async create(userId: string, institutionId: string | null, data: { name: string; parentId?: string; color?: string; icon?: string }) {
    if (data.parentId) {
      const parent = await prisma.folder.findFirst({ where: { id: data.parentId, createdBy: userId } })
      if (!parent) throw AppError.notFound('Parent folder')
    }
    const folder = await prisma.folder.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        color: data.color,
        icon: data.icon,
        createdBy: userId,
        institutionId,
      },
    })
    void auditService.log({ userId, institutionId: institutionId ?? undefined, action: 'folder.created', resource: 'folder', resourceId: folder.id })
    return folder
  },

  async update(id: string, userId: string, data: { name?: string; color?: string; icon?: string; parentId?: string | null }) {
    const folder = await prisma.folder.findFirst({ where: { id, createdBy: userId } })
    if (!folder) throw AppError.notFound('Folder')
    const updated = await prisma.folder.update({ where: { id }, data })
    void auditService.log({ userId, action: 'folder.updated', resource: 'folder', resourceId: id })
    return updated
  },

  async delete(id: string, userId: string) {
    const folder = await prisma.folder.findFirst({ where: { id, createdBy: userId } })
    if (!folder) throw AppError.notFound('Folder')
    // Move documents in this folder to root
    await prisma.document.updateMany({ where: { folderId: id }, data: { folderId: null } })
    // Recursively remove children (DB cascades handle grandchildren via self-relation)
    await prisma.folder.delete({ where: { id } })
    void auditService.log({ userId, action: 'folder.deleted', resource: 'folder', resourceId: id })
  },

  async moveDocuments(folderId: string | null, documentIds: string[], userId: string) {
    if (folderId) {
      const folder = await prisma.folder.findFirst({ where: { id: folderId, createdBy: userId } })
      if (!folder) throw AppError.notFound('Folder')
    }
    await prisma.document.updateMany({
      where: { id: { in: documentIds }, userId },
      data: { folderId },
    })
  },
}

interface FolderWithCount { id: string; parentId: string | null; name: string; color: string | null; icon: string | null; createdAt: Date; _count: { documents: number } }
interface FolderNode extends FolderWithCount { children: FolderNode[] }

function buildTree(folders: FolderWithCount[], parentId: string | null): FolderNode[] {
  return folders
    .filter((f) => f.parentId === parentId)
    .map((f) => ({ ...f, children: buildTree(folders, f.id) }))
}
