import { prisma } from '../../config/database'
import { startOfDay, subDays, endOfDay, eachDayOfInterval, format } from 'date-fns'

export interface DateRange { from: Date; to: Date }
export interface TimeSeriesPoint { date: string; value: number; label?: string }

function last30Days(): DateRange {
  return { from: subDays(startOfDay(new Date()), 29), to: endOfDay(new Date()) }
}

function groupByDay<T extends { createdAt: Date }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = format(item.createdAt, 'yyyy-MM-dd')
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})
}

function fillTimeSeries(grouped: Record<string, number>, range: DateRange): TimeSeriesPoint[] {
  const days = eachDayOfInterval({ start: range.from, end: range.to })
  return days.map((d) => {
    const key = format(d, 'yyyy-MM-dd')
    return { date: key, value: grouped[key] ?? 0 }
  })
}

export const analyticsService = {
  // ── Lecturer dashboard ────────────────────────────────────────────
  async getLecturerDashboard(userId: string, range?: DateRange) {
    const r = range ?? last30Days()

    const [
      totalDocs, docsThisPeriod, docsByType,
      aiUsage, aiTimeSeries,
      questionsCount, assessmentsCount,
      pendingApprovals, approvedDocs,
      recentDocs,
    ] = await Promise.all([
      prisma.document.count({ where: { userId, isTrashed: false } }),
      prisma.document.count({ where: { userId, createdAt: { gte: r.from, lte: r.to }, isTrashed: false } }),
      prisma.document.groupBy({ by: ['type'], where: { userId, isTrashed: false }, _count: { _all: true } }),
      prisma.aIUsage.aggregate({
        where: { userId, createdAt: { gte: r.from, lte: r.to } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { _all: true },
      }),
      prisma.aIUsage.findMany({
        where: { userId, createdAt: { gte: r.from, lte: r.to } },
        select: { createdAt: true, tokensInput: true, tokensOutput: true, costUsd: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.question.count({ where: { createdBy: userId } }),
      prisma.assessment.count({ where: { createdBy: userId } }),
      prisma.approvalWorkflow.count({ where: { document: { userId }, status: 'PENDING' } }),
      prisma.approvalWorkflow.count({ where: { document: { userId }, status: 'APPROVED' } }),
      prisma.document.findMany({
        where: { userId, isTrashed: false },
        select: { id: true, title: true, type: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ])

    // Build AI time series grouped by day
    const aiByDay = groupByDay(aiTimeSeries.map((a) => ({ ...a, createdAt: new Date(a.createdAt) })))
    const aiSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(aiByDay).map(([d, items]) => [d, items.length])),
      r,
    )

    // Build document creation time series
    const docsRaw = await prisma.document.findMany({
      where: { userId, createdAt: { gte: r.from, lte: r.to }, isTrashed: false },
      select: { createdAt: true },
    })
    const docsByDay = groupByDay(docsRaw.map((d) => ({ createdAt: new Date(d.createdAt) })))
    const docSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(docsByDay).map(([d, items]) => [d, items.length])),
      r,
    )

    const totalApprovals = pendingApprovals + approvedDocs
    const approvalRate = totalApprovals > 0 ? Math.round((approvedDocs / totalApprovals) * 100) : null

    return {
      summary: {
        totalDocs,
        docsThisPeriod,
        questionsCount,
        assessmentsCount,
        pendingApprovals,
        approvalRate,
        tokensUsed: (aiUsage._sum.tokensInput ?? 0) + (aiUsage._sum.tokensOutput ?? 0),
        aiCostUsd: aiUsage._sum.costUsd ?? 0,
        aiGenerations: aiUsage._count._all,
      },
      docsByType: docsByType.map((r) => ({ type: r.type, count: r._count._all })),
      aiSeries,
      docSeries,
      recentDocs,
    }
  },

  // ── HOD / Department dashboard ────────────────────────────────────
  async getDepartmentDashboard(institutionId: string, department: string, range?: DateRange) {
    const r = range ?? last30Days()

    const lecturers = await prisma.user.findMany({
      where: { institutionId, department },
      select: { id: true, name: true, role: true },
    })
    const lecturerIds = lecturers.map((l) => l.id)

    const [
      totalDocs, docsThisPeriod,
      totalQuestions, approvedQuestions,
      pendingModeration, pendingApprovals,
      docsByType, aiUsage,
    ] = await Promise.all([
      prisma.document.count({ where: { userId: { in: lecturerIds }, isTrashed: false } }),
      prisma.document.count({ where: { userId: { in: lecturerIds }, createdAt: { gte: r.from }, isTrashed: false } }),
      prisma.question.count({ where: { createdBy: { in: lecturerIds } } }),
      prisma.question.count({ where: { createdBy: { in: lecturerIds }, moderationStatus: 'APPROVED' } }),
      prisma.questionModeration.count({ where: { status: 'PENDING_REVIEW' } }),
      prisma.approvalWorkflow.count({ where: { document: { userId: { in: lecturerIds } }, status: 'PENDING' } }),
      prisma.document.groupBy({ by: ['type'], where: { userId: { in: lecturerIds } }, _count: { _all: true } }),
      prisma.aIUsage.aggregate({
        where: { userId: { in: lecturerIds }, createdAt: { gte: r.from } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { _all: true },
      }),
    ])

    // Per-lecturer doc counts for teaching load distribution
    const lecturerDocCounts = await Promise.all(
      lecturers.map(async (l) => ({
        name: l.name,
        role: l.role,
        documents: await prisma.document.count({ where: { userId: l.id, isTrashed: false } }),
        questions: await prisma.question.count({ where: { createdBy: l.id } }),
        aiGenerations: await prisma.aIUsage.count({ where: { userId: l.id, createdAt: { gte: r.from } } }),
      }))
    )

    return {
      summary: {
        lecturersCount: lecturers.length,
        totalDocs, docsThisPeriod,
        totalQuestions, approvedQuestions,
        pendingModeration, pendingApprovals,
        tokensUsed: (aiUsage._sum.tokensInput ?? 0) + (aiUsage._sum.tokensOutput ?? 0),
        aiCostUsd: aiUsage._sum.costUsd ?? 0,
        aiGenerations: aiUsage._count._all,
      },
      docsByType: docsByType.map((r) => ({ type: r.type, count: r._count._all })),
      teachingLoad: lecturerDocCounts,
    }
  },

  // ── Faculty / Dean dashboard ──────────────────────────────────────
  async getFacultyDashboard(institutionId: string, faculty: string, range?: DateRange) {
    const r = range ?? last30Days()

    const departments = await prisma.department.findMany({
      where: { faculty: { name: faculty }, institutionId },
      select: { id: true, name: true },
    })

    const users = await prisma.user.findMany({
      where: { institutionId, faculty },
      select: { id: true, name: true, department: true },
    })
    const userIds = users.map((u) => u.id)

    // Department breakdown
    const deptBreakdown = await Promise.all(
      departments.map(async (dept) => {
        const deptUserIds = users.filter((u) => u.department === dept.name).map((u) => u.id)
        return {
          department: dept.name,
          lecturers: deptUserIds.length,
          documents: await prisma.document.count({ where: { userId: { in: deptUserIds }, isTrashed: false } }),
          questions: await prisma.question.count({ where: { createdBy: { in: deptUserIds } } }),
          aiGenerations: await prisma.aIUsage.count({ where: { userId: { in: deptUserIds }, createdAt: { gte: r.from } } }),
        }
      })
    )

    const [totalDocs, aiUsage, assessments] = await Promise.all([
      prisma.document.count({ where: { userId: { in: userIds }, isTrashed: false } }),
      prisma.aIUsage.aggregate({
        where: { userId: { in: userIds }, createdAt: { gte: r.from } },
        _sum: { costUsd: true, tokensInput: true, tokensOutput: true },
      }),
      prisma.assessment.count({ where: { createdBy: { in: userIds } } }),
    ])

    return {
      summary: {
        departmentsCount: departments.length,
        lecturersCount: userIds.length,
        totalDocs, assessments,
        tokensUsed: (aiUsage._sum.tokensInput ?? 0) + (aiUsage._sum.tokensOutput ?? 0),
        aiCostUsd: aiUsage._sum.costUsd ?? 0,
      },
      deptBreakdown,
    }
  },

  // ── Institution admin dashboard ───────────────────────────────────
  async getInstitutionDashboard(institutionId: string, range?: DateRange) {
    const r = range ?? last30Days()

    const [
      activeUsers, totalUsers, newUsersThisPeriod,
      totalDocs, docsThisPeriod,
      totalQuestions, totalAssessments,
      aiUsage, aiUsagePrev,
      pendingApprovals,
      docsByStatus, usersByRole,
    ] = await Promise.all([
      prisma.user.count({ where: { institutionId, status: 'ACTIVE' } }),
      prisma.user.count({ where: { institutionId } }),
      prisma.user.count({ where: { institutionId, createdAt: { gte: r.from } } }),
      prisma.document.count({ where: { institutionId, isTrashed: false } }),
      prisma.document.count({ where: { institutionId, createdAt: { gte: r.from }, isTrashed: false } }),
      prisma.question.count({ where: { institutionId } }),
      prisma.assessment.count({ where: { institutionId } }),
      prisma.aIUsage.aggregate({
        where: { user: { institutionId }, createdAt: { gte: r.from } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { _all: true },
      }),
      prisma.aIUsage.aggregate({
        where: { user: { institutionId }, createdAt: { gte: subDays(r.from, 30), lt: r.from } },
        _sum: { costUsd: true },
      }),
      prisma.approvalWorkflow.count({ where: { document: { institutionId }, status: 'PENDING' } }),
      prisma.document.groupBy({ by: ['status'], where: { institutionId }, _count: { _all: true } }),
      prisma.user.groupBy({ by: ['role'], where: { institutionId }, _count: { _all: true } }),
    ])

    // AI usage by provider
    const aiByProvider = await prisma.aIUsage.groupBy({
      by: ['provider'],
      where: { user: { institutionId }, createdAt: { gte: r.from } },
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      _count: { _all: true },
    })

    // Growth trend (docs per day over range)
    const docsRaw = await prisma.document.findMany({
      where: { institutionId, createdAt: { gte: r.from, lte: r.to }, isTrashed: false },
      select: { createdAt: true },
    })
    const byDay = groupByDay(docsRaw.map((d) => ({ createdAt: new Date(d.createdAt) })))
    const growthSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(byDay).map(([d, items]) => [d, items.length])),
      r,
    )

    const prevCost = aiUsagePrev._sum.costUsd ?? 0
    const currCost = aiUsage._sum.costUsd ?? 0
    const costChange = prevCost > 0 ? Math.round(((currCost - prevCost) / prevCost) * 100) : null

    return {
      summary: {
        activeUsers, totalUsers, newUsersThisPeriod,
        totalDocs, docsThisPeriod,
        totalQuestions, totalAssessments,
        pendingApprovals,
        tokensUsed: (aiUsage._sum.tokensInput ?? 0) + (aiUsage._sum.tokensOutput ?? 0),
        aiCostUsd: currCost,
        aiCostChange: costChange,
        aiGenerations: aiUsage._count._all,
      },
      docsByStatus: docsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
      usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count._all })),
      aiByProvider: aiByProvider.map((r) => ({
        provider: r.provider,
        generations: r._count._all,
        tokens: (r._sum.tokensInput ?? 0) + (r._sum.tokensOutput ?? 0),
        costUsd: r._sum.costUsd ?? 0,
      })),
      growthSeries,
    }
  },

  // ── AI usage analytics ────────────────────────────────────────────
  async getAIUsageStats(opts: { userId?: string; institutionId?: string; range?: DateRange }) {
    const r = opts.range ?? last30Days()
    const userWhere = opts.userId
      ? { userId: opts.userId }
      : opts.institutionId
        ? { user: { institutionId: opts.institutionId } }
        : {}

    const [aggregate, byProvider, byModule, byDay] = await Promise.all([
      prisma.aIUsage.aggregate({
        where: { ...userWhere, createdAt: { gte: r.from, lte: r.to } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { _all: true },
        _avg: { costUsd: true },
      }),
      prisma.aIUsage.groupBy({
        by: ['provider'],
        where: { ...userWhere, createdAt: { gte: r.from } },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
        _count: { _all: true },
      }),
      prisma.aIUsage.groupBy({
        by: ['moduleType'],
        where: { ...userWhere, createdAt: { gte: r.from } },
        _count: { _all: true },
        _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
      }),
      prisma.aIUsage.findMany({
        where: { ...userWhere, createdAt: { gte: r.from, lte: r.to } },
        select: { createdAt: true, tokensInput: true, tokensOutput: true, costUsd: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const grouped = groupByDay(byDay.map((d) => ({ ...d, createdAt: new Date(d.createdAt) })))
    const timeSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(grouped).map(([date, items]) => [
        date,
        items.reduce((s, i) => s + (i.tokensInput ?? 0) + (i.tokensOutput ?? 0), 0),
      ])),
      r,
    )
    const costSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(grouped).map(([date, items]) => [
        date,
        Math.round(items.reduce((s, i) => s + (i.costUsd ?? 0), 0) * 10000) / 10000,
      ])),
      r,
    )

    return {
      aggregate: {
        totalGenerations: aggregate._count._all,
        tokensInput: aggregate._sum.tokensInput ?? 0,
        tokensOutput: aggregate._sum.tokensOutput ?? 0,
        totalTokens: (aggregate._sum.tokensInput ?? 0) + (aggregate._sum.tokensOutput ?? 0),
        costUsd: aggregate._sum.costUsd ?? 0,
        avgCostPerGeneration: aggregate._avg.costUsd ?? 0,
      },
      byProvider: byProvider.map((p) => ({
        provider: p.provider,
        generations: p._count._all,
        tokens: (p._sum.tokensInput ?? 0) + (p._sum.tokensOutput ?? 0),
        costUsd: p._sum.costUsd ?? 0,
      })),
      byModule: byModule.map((m) => ({
        moduleType: m.moduleType,
        generations: m._count._all,
        tokens: (m._sum.tokensInput ?? 0) + (m._sum.tokensOutput ?? 0),
        costUsd: m._sum.costUsd ?? 0,
      })),
      timeSeries,
      costSeries,
    }
  },

  // ── Assessment analytics ──────────────────────────────────────────
  async getAssessmentStats(opts: { userId?: string; institutionId?: string; courseId?: string }) {
    const qWhere: Record<string, unknown> = {}
    const aWhere: Record<string, unknown> = {}
    if (opts.userId) { qWhere.createdBy = opts.userId; aWhere.createdBy = opts.userId }
    if (opts.institutionId) { qWhere.institutionId = opts.institutionId; aWhere.institutionId = opts.institutionId }
    if (opts.courseId) { qWhere.courseId = opts.courseId; aWhere.courseId = opts.courseId }

    const [
      totalQuestions, byType, byBloom, byDifficulty, byModeration,
      totalAssessments, byAssessmentType, byAssessmentStatus,
      totalRubrics, totalOutcomes,
    ] = await Promise.all([
      prisma.question.count({ where: qWhere }),
      prisma.question.groupBy({ by: ['type'], where: qWhere, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['bloomLevel'], where: qWhere, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['difficulty'], where: qWhere, _count: { _all: true } }),
      prisma.question.groupBy({ by: ['moderationStatus'], where: qWhere, _count: { _all: true } }),
      prisma.assessment.count({ where: aWhere }),
      prisma.assessment.groupBy({ by: ['type'], where: aWhere, _count: { _all: true } }),
      prisma.assessment.groupBy({ by: ['status'], where: aWhere, _count: { _all: true } }),
      prisma.rubric.count({ where: { createdBy: opts.userId ?? undefined, institutionId: opts.institutionId } }),
      prisma.learningOutcome.count({ where: { institutionId: opts.institutionId, courseId: opts.courseId } }),
    ])

    return {
      questions: {
        total: totalQuestions,
        byType: byType.map((r) => ({ type: r.type, count: r._count._all })),
        byBloom: byBloom.map((r) => ({ level: r.bloomLevel, count: r._count._all })),
        byDifficulty: byDifficulty.map((r) => ({ difficulty: r.difficulty, count: r._count._all })),
        byModeration: byModeration.map((r) => ({ status: r.moderationStatus, count: r._count._all })),
      },
      assessments: {
        total: totalAssessments,
        byType: byAssessmentType.map((r) => ({ type: r.type, count: r._count._all })),
        byStatus: byAssessmentStatus.map((r) => ({ status: r.status, count: r._count._all })),
      },
      rubrics: totalRubrics,
      outcomes: totalOutcomes,
    }
  },

  // ── Document analytics ────────────────────────────────────────────
  async getDocumentStats(opts: { userId?: string; institutionId?: string; range?: DateRange }) {
    const r = opts.range ?? last30Days()
    const where: Record<string, unknown> = { isTrashed: false }
    if (opts.userId) where.userId = opts.userId
    if (opts.institutionId) where.institutionId = opts.institutionId

    const [total, byType, byStatus, createdThisPeriod, approvalStats] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.groupBy({ by: ['type'], where, _count: { _all: true } }),
      prisma.document.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.document.count({ where: { ...where, createdAt: { gte: r.from, lte: r.to } } }),
      prisma.approvalWorkflow.groupBy({
        by: ['status'],
        where: { document: where },
        _count: { _all: true },
      }),
    ])

    // Time series for this range
    const raw = await prisma.document.findMany({
      where: { ...where, createdAt: { gte: r.from, lte: r.to } },
      select: { createdAt: true },
    })
    const byDay = groupByDay(raw.map((d) => ({ createdAt: new Date(d.createdAt) })))
    const timeSeries = fillTimeSeries(
      Object.fromEntries(Object.entries(byDay).map(([d, items]) => [d, items.length])),
      r,
    )

    return {
      total, createdThisPeriod,
      byType: byType.map((r) => ({ type: r.type, count: r._count._all })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      approvalStats: approvalStats.map((r) => ({ status: r.status, count: r._count._all })),
      timeSeries,
    }
  },

  // ── Approval analytics ────────────────────────────────────────────
  async getApprovalStats(opts: { institutionId?: string; range?: DateRange }) {
    const r = opts.range ?? last30Days()
    const where: Record<string, unknown> = {}
    if (opts.institutionId) where.document = { institutionId: opts.institutionId }

    const [byStatus, byStage, thisperiod] = await Promise.all([
      prisma.approvalWorkflow.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.approvalWorkflow.groupBy({ by: ['stage'], where, _count: { _all: true } }),
      prisma.approvalWorkflow.count({ where: { ...where, createdAt: { gte: r.from } } }),
    ])

    const total = byStatus.reduce((s, r) => s + r._count._all, 0)
    const approved = byStatus.find((r) => r.status === 'APPROVED')?._count._all ?? 0
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0

    return {
      total, approvalRate, thisperiod,
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byStage: byStage.map((r) => ({ stage: r.stage, count: r._count._all })),
    }
  },

  // ── Event tracking ────────────────────────────────────────────────
  async trackEvent(data: {
    institutionId?: string; userId?: string; courseId?: string
    eventType: string; entityType?: string; entityId?: string; metadata?: Record<string, unknown>
  }) {
    await prisma.analyticsEvent.create({
      data: {
        institutionId: data.institutionId,
        userId: data.userId,
        courseId: data.courseId,
        eventType: data.eventType as import('@prisma/client').AnalyticsEventType,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: (data.metadata ?? {}) as object,
      },
    })
  },

  // ── Teaching productivity leaderboard ─────────────────────────────
  async getProductivityLeaderboard(institutionId: string, range?: DateRange) {
    const r = range ?? last30Days()
    const users = await prisma.user.findMany({
      where: { institutionId, role: { in: ['LECTURER', 'TEACHING_ASSISTANT'] } },
      select: { id: true, name: true, department: true },
    })

    const entries = await Promise.all(
      users.map(async (u) => ({
        userId: u.id,
        name: u.name,
        department: u.department,
        documents: await prisma.document.count({ where: { userId: u.id, createdAt: { gte: r.from }, isTrashed: false } }),
        questions: await prisma.question.count({ where: { createdBy: u.id, createdAt: { gte: r.from } } }),
        aiGenerations: await prisma.aIUsage.count({ where: { userId: u.id, createdAt: { gte: r.from } } }),
      }))
    )

    return entries.sort((a, b) => (b.documents + b.questions) - (a.documents + a.questions)).slice(0, 20)
  },

  // ── Bloom's taxonomy coverage analysis ───────────────────────────
  async getBloomCoverage(opts: { userId?: string; institutionId?: string; courseId?: string }) {
    const where: Record<string, unknown> = {}
    if (opts.userId) where.createdBy = opts.userId
    if (opts.institutionId) where.institutionId = opts.institutionId
    if (opts.courseId) where.courseId = opts.courseId

    const distribution = await prisma.question.groupBy({
      by: ['bloomLevel'], where, _count: { _all: true },
    })

    const levels = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']
    const total = distribution.reduce((s, d) => s + d._count._all, 0)
    const covered = distribution.map((d) => d.bloomLevel)
    const missing = levels.filter((l) => !covered.includes(l as import('@prisma/client').BloomLevel))

    return {
      distribution: distribution.map((d) => ({
        level: d.bloomLevel,
        count: d._count._all,
        percentage: total > 0 ? Math.round((d._count._all / total) * 100) : 0,
      })),
      total,
      missingLevels: missing,
      coverageScore: Math.round((covered.length / levels.length) * 100),
    }
  },

  // ── Snapshot caching ──────────────────────────────────────────────
  async saveSnapshot(scope: string, scopeId: string | null, metrics: Record<string, unknown>) {
    const date = startOfDay(new Date())
    await prisma.dashboardSnapshot.upsert({
      where: { scope_scopeId_date: { scope, scopeId: scopeId ?? '', date } },
      create: { scope, scopeId, date, metrics: metrics as object },
      update: { metrics: metrics as object },
    })
  },

  async getSnapshot(scope: string, scopeId: string | null) {
    const date = startOfDay(new Date())
    return prisma.dashboardSnapshot.findUnique({
      where: { scope_scopeId_date: { scope, scopeId: scopeId ?? '', date } },
    })
  },
}
