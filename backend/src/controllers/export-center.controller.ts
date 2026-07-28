import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { enhancedExportService, type ExportFormat } from '../services/export/enhanced-export.service'
import { prisma } from '../config/database'
import fs from 'fs'

export const exportCenterController = {
  // Immediate download (synchronous)
  download: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { format = 'pdf', templateId, watermark } = req.query as { format?: string; templateId?: string; watermark?: string }

    const { fileBuffer, mimeType, filename } = await enhancedExportService.export(
      id, req.user!.userId,
      { format: format as ExportFormat, templateId, watermark },
    )

    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(fileBuffer)
  }),

  // Async export (queued)
  queue: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { format = 'pdf', templateId } = req.body as { format?: string; templateId?: string }

    const exportRecord = await prisma.export.create({
      data: { documentId: id, userId: req.user!.userId, format, status: 'PENDING' },
    })

    const { exportQueue } = await import('../services/queue/queues')
    await exportQueue.add('export-document', {
      userId: req.user!.userId,
      documentId: id,
      format,
      exportId: exportRecord.id,
      templateId,
    }, { jobId: exportRecord.id })

    res.status(202).json({ status: 'success', exportId: exportRecord.id })
  }),

  // List user's exports
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }
    const p = Math.max(1, Number(page))
    const l = Math.min(50, Number(limit))
    const [data, total] = await Promise.all([
      prisma.export.findMany({
        where: { userId: req.user!.userId },
        include: { document: { select: { title: true, type: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
      }),
      prisma.export.count({ where: { userId: req.user!.userId } }),
    ])
    res.json({ status: 'success', data, total, page: p, totalPages: Math.ceil(total / l) })
  }),

  // Download completed export file
  downloadCompleted: asyncHandler(async (req: Request, res: Response) => {
    const { exportId } = req.params as { exportId: string }
    const filePath = await enhancedExportService.getDownloadPath(exportId, req.user!.userId)
    const exp = await prisma.export.findUnique({ where: { id: exportId } })
    const ext = exp?.format ?? 'pdf'
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      html: 'text/html',
      markdown: 'text/markdown',
      txt: 'text/plain',
    }
    res.setHeader('Content-Type', mimeMap[ext] ?? 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="export.${ext}"`)
    const stream = fs.createReadStream(filePath)
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).json({ status: 'error', message: 'File read failed' })
    })
    stream.pipe(res)
  }),

  // Export templates CRUD
  listTemplates: asyncHandler(async (req: Request, res: Response) => {
    const data = await prisma.exportTemplate.findMany({
      where: { institutionId: req.user!.institutionId ?? null },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ status: 'success', data })
  }),

  createTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { name, category, headerHtml, footerHtml, watermark, logoUrl, primaryColor, fontFamily, includePageNumbers, includeQrCode, isDefault } = req.body as {
      name: string; category?: string; headerHtml?: string; footerHtml?: string; watermark?: string
      logoUrl?: string; primaryColor?: string; fontFamily?: string
      includePageNumbers?: boolean; includeQrCode?: boolean; isDefault?: boolean
    }
    if (!name?.trim()) throw AppError.badRequest('name is required')

    if (isDefault) {
      await prisma.exportTemplate.updateMany({
        where: { institutionId: req.user!.institutionId ?? null, isDefault: true },
        data: { isDefault: false },
      })
    }

    const template = await prisma.exportTemplate.create({
      data: {
        name, category: category ?? 'general', headerHtml, footerHtml, watermark,
        logoUrl, primaryColor, fontFamily, includePageNumbers, includeQrCode, isDefault,
        institutionId: req.user!.institutionId ?? null,
        createdBy: req.user!.userId,
      },
    })
    res.status(201).json({ status: 'success', data: template })
  }),

  deleteTemplate: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const template = await prisma.exportTemplate.findFirst({
      where: { id, createdBy: req.user!.userId },
    })
    if (!template) throw AppError.notFound('Template')
    await prisma.exportTemplate.delete({ where: { id } })
    res.json({ status: 'success' })
  }),
}
