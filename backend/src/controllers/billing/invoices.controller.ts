import type { RequestHandler } from 'express'
import { asyncHandler } from '../../utils/asyncHandler'
import { invoiceService } from '../../services/billing/invoice.service'
import { AppError } from '../../utils/errors'

export const invoicesController = {
  list: asyncHandler(async (req, res) => {
    const { institutionId } = req.user!
    if (!institutionId) throw AppError.forbidden()
    const { page, limit, status } = req.query as Record<string, string>
    const result = await invoiceService.getInvoices(institutionId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    })
    res.json({ success: true, ...result })
  }) as RequestHandler,

  get: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoice(req.params.id as string)
    if (req.user!.institutionId && invoice.institutionId !== req.user!.institutionId) {
      throw AppError.forbidden()
    }
    res.json({ success: true, data: invoice })
  }) as RequestHandler,

  download: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.getInvoice(req.params.id as string)
    if (req.user!.institutionId && invoice.institutionId !== req.user!.institutionId) {
      throw AppError.forbidden()
    }
    const pdfBuffer = await invoiceService.downloadInvoice(req.params.id as string)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`)
    res.send(pdfBuffer)
  }) as RequestHandler,

  // Admin
  adminList: asyncHandler(async (req, res) => {
    const { page, limit, status, institutionId } = req.query as Record<string, string>
    const result = await invoiceService.getAllInvoices({ page: Number(page), limit: Number(limit), status, institutionId })
    res.json({ success: true, ...result })
  }) as RequestHandler,

  adminVoid: asyncHandler(async (req, res) => {
    const invoice = await invoiceService.voidInvoice(req.params.id as string)
    res.json({ success: true, data: invoice })
  }) as RequestHandler,

  adminRevenueStats: asyncHandler(async (req, res) => {
    const { from, to } = req.query as Record<string, string>
    const stats = await invoiceService.getRevenueStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    )
    res.json({ success: true, data: stats })
  }) as RequestHandler,
}
