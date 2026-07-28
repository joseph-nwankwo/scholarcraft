import { prisma } from '../config/database'
import { reportService } from '../services/analytics/report.service'
import { logger } from '../utils/logger'
import { env } from '../config/env'

const POLL_MS = 60_000 // check every minute

async function dispatchDueReports() {
  const now = new Date()

  const due = await prisma.scheduledReport.findMany({
    where: { isActive: true, nextRunAt: { lte: now } },
    include: { creator: { select: { name: true, email: true } } },
  })

  if (due.length === 0) return

  logger.info(`[report-worker] ${due.length} report(s) due`)

  for (const report of due) {
    try {
      // Determine date range based on frequency
      const rangeMs: Record<string, number> = {
        DAILY: 1, WEEKLY: 7, MONTHLY: 30, SEMESTER: 120, ACADEMIC_SESSION: 365,
      }
      const days = rangeMs[report.frequency] ?? 30
      const range = { from: new Date(now.getTime() - days * 24 * 60 * 60 * 1000), to: now }
      const fmt = report.format === 'CSV' ? 'csv' : 'pdf'

      const { buffer, mimeType, filename } = await reportService.generateTeachingReport({
        userId: report.createdBy,
        institutionId: report.institutionId,
        range,
        format: fmt,
      })

      // Send to each recipient
      const { emailService } = await import('../services/email/email.service')
      for (const recipient of report.recipients) {
        await emailService.sendScheduledReport({
          to: recipient,
          reportName: report.name,
          frequency: report.frequency,
          buffer,
          mimeType,
          filename,
        })
      }

      await prisma.scheduledReport.update({
        where: { id: report.id },
        data: {
          lastRunAt: now,
          nextRunAt: reportService.calcNextRun(report.frequency),
        },
      })

      logger.info(`[report-worker] Dispatched "${report.name}" to ${report.recipients.length} recipient(s)`)
    } catch (err) {
      logger.error(`[report-worker] Failed to dispatch report "${report.name}"`, { err: (err as Error).message })
    }
  }
}

export function startReportWorker() {
  if (!env.SMTP_HOST) {
    logger.warn('[report-worker] SMTP not configured — scheduled reports will not be sent')
  }
  void dispatchDueReports()
  const interval = setInterval(() => void dispatchDueReports(), POLL_MS)
  interval.unref()
  logger.info('[report-worker] Scheduled report worker started (polling every 60s)')
}
