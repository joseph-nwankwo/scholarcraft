import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { getGenerator, GENERATOR_TYPES } from '../services/ai/generators/index'
import { versionService } from '../services/document/version.service'
import { prisma } from '../config/database'
import type { GenerationParams } from '../services/ai/generators/base.generator'

function buildParams(body: Record<string, unknown>): GenerationParams {
  return {
    topic:              String(body.topic ?? ''),
    subject:            body.subject ? String(body.subject) : undefined,
    courseId:           body.courseId ? String(body.courseId) : undefined,
    courseCode:         body.courseCode ? String(body.courseCode) : undefined,
    courseTitle:        body.courseTitle ? String(body.courseTitle) : undefined,
    academicLevel:      (body.academicLevel as GenerationParams['academicLevel']) ?? 'BSC',
    bloomLevel:         body.bloomLevel as GenerationParams['bloomLevel'] | undefined,
    difficulty:         body.difficulty as GenerationParams['difficulty'] | undefined,
    wordCount:          body.wordCount ? Number(body.wordCount) : undefined,
    duration:           body.duration ? Number(body.duration) : undefined,
    teachingStyle:      body.teachingStyle ? String(body.teachingStyle) : undefined,
    language:           body.language ? String(body.language) : undefined,
    tone:               body.tone ? String(body.tone) : undefined,
    referenceStyle:     body.referenceStyle ? String(body.referenceStyle) : undefined,
    outputFormat:       body.outputFormat ? String(body.outputFormat) : undefined,
    includeExamples:    Boolean(body.includeExamples ?? true),
    includeCaseStudies: Boolean(body.includeCaseStudies ?? false),
    includeExercises:   Boolean(body.includeExercises ?? true),
    includeReferences:  Boolean(body.includeReferences ?? true),
    customInstructions: body.customInstructions ? String(body.customInstructions) : undefined,
    sourceContext:      body.sourceContext ? String(body.sourceContext) : undefined,
    numberOfQuestions:  body.numberOfQuestions ? Number(body.numberOfQuestions) : undefined,
    numberOfWeeks:      body.numberOfWeeks ? Number(body.numberOfWeeks) : undefined,
    provider:           body.provider as GenerationParams['provider'],
    model:              body.model ? String(body.model) : undefined,
    maxTokens:          body.maxTokens ? Number(body.maxTokens) : undefined,
    temperature:        body.temperature ? Number(body.temperature) : undefined,
  }
}

export const generateController = {
  // GET /api/generate/types - list available generator types
  listTypes: asyncHandler(async (_req: Request, res: Response) => {
    const types = GENERATOR_TYPES.map((type) => {
      const g = getGenerator(type)
      return { type, moduleType: g.moduleType, documentType: g.documentType }
    })
    res.json({ status: 'success', data: types })
  }),

  // POST /api/generate/:type/stream - SSE streaming generation
  stream: asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params as { type: string }
    const generator = getGenerator(type) // throws if invalid type

    if (!req.body.topic) throw AppError.badRequest('topic is required')

    const params = buildParams(req.body as Record<string, unknown>)
    params.institutionId = req.user!.institutionId ?? undefined

    const userId = req.user!.userId

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    let aborted = false
    req.on('close', () => { aborted = true })

    try {
      const result = await generator.generate(params, userId, (chunk) => {
        if (!aborted) res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      })

      if (!aborted) {
        res.write(`data: ${JSON.stringify({ done: true, documentId: result.documentId, tokensUsed: result.tokensInput + result.tokensOutput })}\n\n`)
      }
    } catch (err: unknown) {
      if (!aborted) {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
      }
    }

    res.end()
  }),

  // POST /api/generate/:type/async - queue-based async generation
  async: asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params as { type: string }
    getGenerator(type) // validate type

    if (!req.body.topic) throw AppError.badRequest('topic is required')

    const params = buildParams(req.body as Record<string, unknown>)
    params.institutionId = req.user!.institutionId ?? undefined
    const userId = req.user!.userId

    const { aiQueue } = await import('../services/queue/queues')

    const dbJob = await prisma.job.create({
      data: {
        bullJobId: `gen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: `generate-${type}`,
        status: 'QUEUED',
        userId,
        payload: { type, params } as unknown as never,
      },
    })

    await aiQueue.add('generate-typed', {
      userId,
      moduleType: type,
      provider: params.provider ?? 'anthropic',
      model: params.model ?? 'claude-sonnet-4-6',
      prompt: JSON.stringify(params),
      jobId: dbJob.bullJobId,
    }, { jobId: dbJob.bullJobId })

    res.status(202).json({ status: 'success', jobId: dbJob.bullJobId })
  }),

  // GET /api/generate/history
  history: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, moduleType, search } = req.query as {
      page?: string; limit?: string; moduleType?: string; search?: string
    }
    const p = Math.max(1, Number(page))
    const l = Math.min(50, Number(limit))
    const skip = (p - 1) * l
    const userId = req.user!.userId

    const where = {
      userId,
      ...(moduleType ? { moduleType } : {}),
      ...(search ? { OR: [
        { document: { title: { contains: search, mode: 'insensitive' as const } } },
        { moduleType: { contains: search, mode: 'insensitive' as const } },
      ] } : {}),
    }

    const [generations, total] = await Promise.all([
      prisma.aIGeneration.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
        include: { document: { select: { id: true, title: true, type: true, status: true } } },
      }),
      prisma.aIGeneration.count({ where }),
    ])

    res.json({ status: 'success', data: generations, total, page: p, totalPages: Math.ceil(total / l) })
  }),

  // GET /api/generate/stats
  stats: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId

    const today = new Date(); today.setHours(0, 0, 0, 0)

    const [todayCount, totalCount, moduleBreakdown, recentActivity, tokenUsage] = await Promise.all([
      prisma.aIGeneration.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.aIGeneration.count({ where: { userId } }),
      prisma.aIGeneration.groupBy({ by: ['moduleType'], where: { userId }, _count: true, orderBy: { _count: { moduleType: 'desc' } }, take: 8 }),
      prisma.aIGeneration.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5, include: { document: { select: { id: true, title: true } } } }),
      prisma.aIUsage.aggregate({ where: { userId }, _sum: { tokensInput: true, tokensOutput: true, costUsd: true } }),
    ])

    const avgTime = await prisma.aIGeneration.aggregate({ where: { userId }, _avg: { durationMs: true } })

    res.json({
      status: 'success',
      data: {
        todayCount, totalCount,
        avgGenerationTime: Math.round((avgTime._avg.durationMs ?? 0) / 1000),
        moduleBreakdown, recentActivity,
        tokenUsage: {
          input: tokenUsage._sum.tokensInput ?? 0,
          output: tokenUsage._sum.tokensOutput ?? 0,
          totalCostUsd: tokenUsage._sum.costUsd ?? 0,
        },
      },
    })
  }),

  // GET /api/generate/documents - list user's generated documents
  listDocuments: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, type, status, search, courseId } = req.query as {
      page?: string; limit?: string; type?: string; status?: string; search?: string; courseId?: string
    }
    const p = Math.max(1, Number(page))
    const l = Math.min(50, Number(limit))
    const skip = (p - 1) * l
    const userId = req.user!.userId

    const where: Record<string, unknown> = {
      userId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(courseId ? { courseId } : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    }

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: l,
        include: {
          course: { select: { id: true, code: true, title: true } },
          currentVersion: { select: { version: true, wordCount: true } },
          _count: { select: { versions: true, exports: true } },
        },
      }),
      prisma.document.count({ where }),
    ])

    res.json({ status: 'success', data: docs, total, page: p, totalPages: Math.ceil(total / l) })
  }),

  // GET /api/generate/documents/:id
  getDocument: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const doc = await prisma.document.findFirst({
      where: { id, userId: req.user!.userId },
      include: {
        course: { select: { id: true, code: true, title: true } },
        currentVersion: true,
        versions: { orderBy: { version: 'desc' }, take: 10, include: { creator: { select: { id: true, name: true } } } },
        aiGeneration: { select: { provider: true, model: true, tokensInput: true, tokensOutput: true, durationMs: true } },
        exports: { orderBy: { createdAt: 'desc' }, take: 5 },
        _count: { select: { versions: true } },
      },
    })
    if (!doc) throw AppError.notFound('Document')
    res.json({ status: 'success', data: doc })
  }),

  // PUT /api/generate/documents/:id
  updateDocument: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { title, description, status, tags, content } = req.body as {
      title?: string; description?: string; status?: string; tags?: string[]; content?: string
    }

    const doc = await prisma.document.findFirst({ where: { id, userId: req.user!.userId } })
    if (!doc) throw AppError.notFound('Document')

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status ? { status: status as never } : {}),
        ...(tags ? { tags } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    })

    if (content !== undefined) {
      await versionService.create(id, req.user!.userId, content)
    }

    res.json({ status: 'success', data: updated })
  }),

  // DELETE /api/generate/documents/:id
  deleteDocument: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const doc = await prisma.document.findFirst({ where: { id, userId: req.user!.userId } })
    if (!doc) throw AppError.notFound('Document')

    await prisma.document.update({ where: { id }, data: { status: 'ARCHIVED' } })
    res.json({ status: 'success', message: 'Document archived' })
  }),

  // GET /api/generate/documents/:id/versions
  listVersions: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const versions = await versionService.list(id, req.user!.userId)
    res.json({ status: 'success', data: versions })
  }),

  // POST /api/generate/documents/:id/versions
  createVersion: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { content, prompt } = req.body as { content: string; prompt?: string }
    if (!content) throw AppError.badRequest('content is required')

    const version = await versionService.create(id, req.user!.userId, content, prompt)
    res.status(201).json({ status: 'success', data: version })
  }),

  // POST /api/generate/documents/:id/versions/:versionId/restore
  restoreVersion: asyncHandler(async (req: Request, res: Response) => {
    const { id, versionId } = req.params as { id: string; versionId: string }
    const version = await versionService.restore(id, versionId, req.user!.userId)
    res.json({ status: 'success', data: version })
  }),

  // POST /api/generate/documents/:id/export
  exportDocument: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as { id: string }
    const { format = 'markdown' } = req.body as { format?: string }

    const doc = await prisma.document.findFirst({ where: { id, userId: req.user!.userId } })
    if (!doc) throw AppError.notFound('Document')

    const exportRecord = await prisma.export.create({
      data: { documentId: id, userId: req.user!.userId, format, status: 'PENDING' },
    })

    const { exportQueue } = await import('../services/queue/queues')
    await exportQueue.add('export-document', {
      userId: req.user!.userId,
      documentId: id,
      format,
      exportId: exportRecord.id,
    }, { jobId: exportRecord.id })

    res.status(202).json({ status: 'success', exportId: exportRecord.id, message: 'Export queued' })
  }),
}
