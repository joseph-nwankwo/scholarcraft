import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { generatePDF } from '../document/pdf.service'
import { analyticsService, type DateRange } from './analytics.service'
import { format } from 'date-fns'

// ── CSV helpers ───────────────────────────────────────────────────────────────
function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

function buildReportHTML(title: string, sections: Array<{ heading: string; content: string }>): string {
  const body = sections
    .map(
      (s) => `
    <section style="margin-bottom:2em">
      <h2 style="font-size:1.1em;color:#1e3a5f;border-bottom:1px solid #e2e8f0;padding-bottom:4px">${s.heading}</h2>
      ${s.content}
    </section>`,
    )
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1a202c; padding: 32px; max-width: 900px; margin: 0 auto; }
      h1 { font-size: 1.5em; color: #1e3a5f; margin-bottom: 4px; }
      .meta { color: #718096; font-size: 0.85em; margin-bottom: 2em; }
      table { border-collapse: collapse; width: 100%; margin-top: 0.5em; }
      th { background: #f7fafc; color: #4a5568; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 0.8em; }
      td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 0.85em; }
      tr:nth-child(even) { background: #f7fafc; }
      .stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-top: 0.5em; }
      .stat { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
      .stat-value { font-size: 1.4em; font-weight: 700; color: #1e3a5f; }
      .stat-label { font-size: 0.75em; color: #718096; margin-top: 2px; }
    </style>
  </head><body>
    <h1>${title}</h1>
    <p class="meta">Generated ${format(new Date(), 'PPPp')}</p>
    ${body}
  </body></html>`
}

function statsGrid(stats: Array<{ label: string; value: string | number }>): string {
  return `<div class="stat-grid">${stats.map((s) => `<div class="stat"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`).join('')}</div>`
}

function dataTable(headers: string[], rows: Array<(string | number)[]>): string {
  const ths = headers.map((h) => `<th>${h}</th>`).join('')
  const trs = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
}

export const reportService = {
  // ── Report Templates ──────────────────────────────────────────────
  async listTemplates(institutionId: string | null, userId: string) {
    return prisma.reportTemplate.findMany({
      where: { OR: [{ createdBy: userId }, { institutionId, isPublic: true }] },
      include: { creator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createTemplate(userId: string, institutionId: string | null, data: {
    name: string; description?: string; category: string; config?: object; isPublic?: boolean
  }) {
    return prisma.reportTemplate.create({
      data: { ...data, createdBy: userId, institutionId, config: (data.config ?? {}) as object },
    })
  },

  async deleteTemplate(id: string, userId: string) {
    const t = await prisma.reportTemplate.findFirst({ where: { id, createdBy: userId } })
    if (!t) throw AppError.notFound('Report template')
    await prisma.reportTemplate.delete({ where: { id } })
  },

  // ── Scheduled Reports ─────────────────────────────────────────────
  async listScheduled(userId: string, institutionId: string | null) {
    return prisma.scheduledReport.findMany({
      where: { OR: [{ createdBy: userId }, { institutionId }] },
      include: { template: { select: { name: true } }, creator: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async createScheduled(userId: string, institutionId: string | null, data: {
    name: string; frequency: import('@prisma/client').ReportFrequency
    format?: import('@prisma/client').ReportFormat
    recipients: string[]; filters?: object; templateId?: string; isActive?: boolean
  }) {
    const nextRunAt = this.calcNextRun(data.frequency)
    return prisma.scheduledReport.create({
      data: {
        ...data, createdBy: userId, institutionId,
        filters: (data.filters ?? {}) as object,
        nextRunAt,
      },
    })
  },

  async updateScheduled(id: string, userId: string, data: Partial<{
    name: string; frequency: import('@prisma/client').ReportFrequency
    format: import('@prisma/client').ReportFormat
    recipients: string[]; isActive: boolean; filters: object
  }>) {
    const existing = await prisma.scheduledReport.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Scheduled report')
    const nextRunAt = data.frequency ? this.calcNextRun(data.frequency) : undefined
    return prisma.scheduledReport.update({
      where: { id },
      data: { ...data, ...(nextRunAt ? { nextRunAt } : {}), filters: (data.filters ?? existing.filters) as object },
    })
  },

  async deleteScheduled(id: string, userId: string) {
    const existing = await prisma.scheduledReport.findFirst({ where: { id, createdBy: userId } })
    if (!existing) throw AppError.notFound('Scheduled report')
    await prisma.scheduledReport.delete({ where: { id } })
  },

  calcNextRun(frequency: import('@prisma/client').ReportFrequency): Date {
    const now = new Date()
    switch (frequency) {
      case 'DAILY':   return new Date(now.getTime() + 24 * 60 * 60 * 1000)
      case 'WEEKLY':  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      case 'MONTHLY': { const d = new Date(now); d.setMonth(d.getMonth() + 1); return d }
      case 'SEMESTER': { const d = new Date(now); d.setMonth(d.getMonth() + 4); return d }
      case 'ACADEMIC_SESSION': { const d = new Date(now); d.setFullYear(d.getFullYear() + 1); return d }
    }
  },

  // ── Report Generation ─────────────────────────────────────────────
  async generateTeachingReport(
    opts: { userId: string; institutionId: string | null; range: DateRange; format: 'pdf' | 'csv' }
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const [dash, docStats, aiStats, approvalStats] = await Promise.all([
      analyticsService.getLecturerDashboard(opts.userId, opts.range),
      analyticsService.getDocumentStats({ userId: opts.userId, range: opts.range }),
      analyticsService.getAIUsageStats({ userId: opts.userId, range: opts.range }),
      analyticsService.getApprovalStats({ institutionId: opts.institutionId ?? undefined, range: opts.range }),
    ])

    if (opts.format === 'csv') {
      const rows = [
        { metric: 'Total Documents', value: dash.summary.totalDocs },
        { metric: 'Documents This Period', value: dash.summary.docsThisPeriod },
        { metric: 'Questions in Bank', value: dash.summary.questionsCount },
        { metric: 'Assessments', value: dash.summary.assessmentsCount },
        { metric: 'AI Generations', value: dash.summary.aiGenerations },
        { metric: 'Tokens Used', value: dash.summary.tokensUsed },
        { metric: 'AI Cost (USD)', value: aiStats.aggregate.costUsd.toFixed(4) },
        { metric: 'Approval Rate (%)', value: approvalStats.approvalRate },
      ]
      return {
        buffer: Buffer.from(toCSV(rows), 'utf-8'),
        mimeType: 'text/csv',
        filename: `teaching-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      }
    }

    // PDF
    const html = buildReportHTML('Teaching Activity Report', [
      {
        heading: 'Summary',
        content: statsGrid([
          { label: 'Total Documents', value: dash.summary.totalDocs },
          { label: 'This Period', value: dash.summary.docsThisPeriod },
          { label: 'Questions', value: dash.summary.questionsCount },
          { label: 'Assessments', value: dash.summary.assessmentsCount },
          { label: 'AI Generations', value: dash.summary.aiGenerations },
          { label: 'AI Cost (USD)', value: `$${aiStats.aggregate.costUsd.toFixed(4)}` },
        ]),
      },
      {
        heading: 'Documents by Type',
        content: dataTable(['Type', 'Count'], docStats.byType.map((r) => [r.type, r.count])),
      },
      {
        heading: 'AI Usage by Provider',
        content: dataTable(
          ['Provider', 'Generations', 'Tokens', 'Cost (USD)'],
          aiStats.byProvider.map((p) => [p.provider, p.generations, p.tokens, `$${p.costUsd.toFixed(4)}`]),
        ),
      },
      {
        heading: 'Approval Status',
        content: dataTable(['Status', 'Count'], approvalStats.byStatus.map((r) => [r.status, r.count])),
      },
    ])

    return {
      buffer: await generatePDF(html),
      mimeType: 'application/pdf',
      filename: `teaching-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    }
  },

  async generateAssessmentReport(
    opts: { userId?: string; institutionId: string | null; format: 'pdf' | 'csv' }
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const stats = await analyticsService.getAssessmentStats({
      userId: opts.userId,
      institutionId: opts.institutionId ?? undefined,
    })

    if (opts.format === 'csv') {
      const rows = [
        { section: 'Questions', metric: 'Total', value: stats.questions.total },
        ...stats.questions.byType.map((r) => ({ section: 'By Type', metric: r.type, value: r.count })),
        ...stats.questions.byBloom.map((r) => ({ section: 'By Bloom', metric: r.level, value: r.count })),
        ...stats.questions.byDifficulty.map((r) => ({ section: 'By Difficulty', metric: r.difficulty, value: r.count })),
        { section: 'Assessments', metric: 'Total', value: stats.assessments.total },
        ...stats.assessments.byType.map((r) => ({ section: 'Assessment Type', metric: r.type, value: r.count })),
      ]
      return {
        buffer: Buffer.from(toCSV(rows), 'utf-8'),
        mimeType: 'text/csv',
        filename: `assessment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      }
    }

    const html = buildReportHTML('Assessment & Question Bank Report', [
      {
        heading: 'Summary',
        content: statsGrid([
          { label: 'Total Questions', value: stats.questions.total },
          { label: 'Total Assessments', value: stats.assessments.total },
          { label: 'Rubrics', value: stats.rubrics },
          { label: 'Learning Outcomes', value: stats.outcomes },
        ]),
      },
      {
        heading: 'Questions by Bloom\'s Level',
        content: dataTable(['Level', 'Count'], stats.questions.byBloom.map((r) => [r.level, r.count])),
      },
      {
        heading: 'Questions by Difficulty',
        content: dataTable(['Difficulty', 'Count'], stats.questions.byDifficulty.map((r) => [r.difficulty, r.count])),
      },
      {
        heading: 'Questions by Type',
        content: dataTable(['Type', 'Count'], stats.questions.byType.map((r) => [r.type, r.count])),
      },
      {
        heading: 'Moderation Status',
        content: dataTable(['Status', 'Count'], stats.questions.byModeration.map((r) => [r.status, r.count])),
      },
    ])

    return {
      buffer: await generatePDF(html),
      mimeType: 'application/pdf',
      filename: `assessment-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    }
  },

  async generateAIReport(
    opts: { userId?: string; institutionId: string | null; range: DateRange; format: 'pdf' | 'csv' }
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const stats = await analyticsService.getAIUsageStats({
      userId: opts.userId,
      institutionId: opts.institutionId ?? undefined,
      range: opts.range,
    })

    if (opts.format === 'csv') {
      const rows = stats.byProvider.map((p) => ({
        provider: p.provider, generations: p.generations,
        tokens: p.tokens, costUsd: p.costUsd.toFixed(4),
      }))
      return {
        buffer: Buffer.from(toCSV(rows), 'utf-8'),
        mimeType: 'text/csv',
        filename: `ai-usage-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      }
    }

    const html = buildReportHTML('AI Usage Report', [
      {
        heading: 'Summary',
        content: statsGrid([
          { label: 'Total Generations', value: stats.aggregate.totalGenerations },
          { label: 'Total Tokens', value: stats.aggregate.totalTokens.toLocaleString() },
          { label: 'Total Cost (USD)', value: `$${stats.aggregate.costUsd.toFixed(4)}` },
          { label: 'Avg Cost/Generation', value: `$${stats.aggregate.avgCostPerGeneration.toFixed(5)}` },
        ]),
      },
      {
        heading: 'Usage by Provider',
        content: dataTable(
          ['Provider', 'Generations', 'Tokens', 'Cost (USD)'],
          stats.byProvider.map((p) => [p.provider, p.generations, p.tokens.toLocaleString(), `$${p.costUsd.toFixed(4)}`]),
        ),
      },
      {
        heading: 'Usage by Module',
        content: dataTable(
          ['Module', 'Generations', 'Tokens', 'Cost (USD)'],
          stats.byModule.map((m) => [m.moduleType, m.generations, m.tokens.toLocaleString(), `$${m.costUsd.toFixed(4)}`]),
        ),
      },
    ])

    return {
      buffer: await generatePDF(html),
      mimeType: 'application/pdf',
      filename: `ai-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    }
  },

  async generateInstitutionReport(
    opts: { institutionId: string; format: 'pdf' | 'csv' }
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const [instData, _aiStats, _assStats] = await Promise.all([
      analyticsService.getInstitutionDashboard(opts.institutionId),
      analyticsService.getAIUsageStats({ institutionId: opts.institutionId }),
      analyticsService.getAssessmentStats({ institutionId: opts.institutionId }),
    ])

    if (opts.format === 'csv') {
      const rows = [
        { metric: 'Active Users', value: instData.summary.activeUsers },
        { metric: 'Total Users', value: instData.summary.totalUsers },
        { metric: 'Total Documents', value: instData.summary.totalDocs },
        { metric: 'Total Questions', value: instData.summary.totalQuestions },
        { metric: 'Total Assessments', value: instData.summary.totalAssessments },
        { metric: 'AI Generations', value: instData.summary.aiGenerations },
        { metric: 'AI Cost (USD)', value: instData.summary.aiCostUsd.toFixed(4) },
      ]
      return {
        buffer: Buffer.from(toCSV(rows), 'utf-8'),
        mimeType: 'text/csv',
        filename: `institution-report-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      }
    }

    const html = buildReportHTML('Institution Analytics Report', [
      {
        heading: 'User Summary',
        content: statsGrid([
          { label: 'Active Users', value: instData.summary.activeUsers },
          { label: 'Total Users', value: instData.summary.totalUsers },
          { label: 'New This Month', value: instData.summary.newUsersThisPeriod },
        ]),
      },
      {
        heading: 'Content Summary',
        content: statsGrid([
          { label: 'Total Documents', value: instData.summary.totalDocs },
          { label: 'Questions', value: instData.summary.totalQuestions },
          { label: 'Assessments', value: instData.summary.totalAssessments },
        ]),
      },
      {
        heading: 'AI Usage Summary',
        content: statsGrid([
          { label: 'Generations', value: instData.summary.aiGenerations },
          { label: 'Tokens Used', value: instData.summary.tokensUsed.toLocaleString() },
          { label: 'Total Cost', value: `$${instData.summary.aiCostUsd.toFixed(2)}` },
        ]),
      },
      {
        heading: 'Users by Role',
        content: dataTable(['Role', 'Count'], instData.usersByRole.map((r) => [r.role, r.count])),
      },
      {
        heading: 'AI by Provider',
        content: dataTable(
          ['Provider', 'Generations', 'Cost (USD)'],
          instData.aiByProvider.map((p) => [p.provider, p.generations, `$${p.costUsd.toFixed(2)}`]),
        ),
      },
    ])

    return {
      buffer: await generatePDF(html),
      mimeType: 'application/pdf',
      filename: `institution-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    }
  },
}
