import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { AIProviderFactory } from '../services/ai/factory'
import type { Queue } from 'bullmq'
let _aiQueue: Queue | null = null
async function getAiQueue() {
  if (!_aiQueue) ({ aiQueue: _aiQueue } = await import('../services/queue/queues'))
  return _aiQueue!
}
import { prisma } from '../config/database'
import type { AIProviderID } from '../services/ai/types'

export const aiController = {
  // Streaming SSE generation
  stream: asyncHandler(async (req: Request, res: Response) => {
    const { prompt, systemPrompt, provider, model, moduleType, courseId, maxTokens, temperature } =
      req.body as {
        prompt: string
        systemPrompt?: string
        provider?: AIProviderID
        model?: string
        moduleType?: string
        courseId?: string
        maxTokens?: number
        temperature?: number
      }

    if (!prompt) throw AppError.badRequest('Prompt is required')

    const aiProvider = provider
      ? AIProviderFactory.create(provider)
      : AIProviderFactory.getDefault()

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullContent = ''

    const result = await aiProvider.stream(
      { prompt, systemPrompt, model, maxTokens, temperature },
      (chunk) => {
        fullContent += chunk
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`)
      }
    )

    // Persist generation
    const userId = req.user!.userId

    // Map moduleType → DocumentType enum
    const MODULE_TYPE_MAP: Record<string, string> = {
      'teaching-assistant':  'LECTURE_NOTE',
      'research-assistant':  'LECTURE_NOTE',
      'grading-assistant':   'MARKING_SCHEME',
    }
    const docType = (MODULE_TYPE_MAP[moduleType ?? ''] ?? 'LECTURE_NOTE') as 'LECTURE_NOTE' | 'MARKING_SCHEME'

    // Build a human-readable title from the first non-empty line of the prompt
    const firstLine = prompt.split('\n').map((l) => l.trim()).find((l) => l.length > 5) ?? 'Generation'
    const autoTitle = firstLine.replace(/^#+\s*/, '').replace(/\*+/g, '').slice(0, 80)

    const document = await prisma.document.create({
      data: {
        title: autoTitle,
        type: docType,
        content: result.content,
        userId,
        courseId,
        tags: moduleType ? [moduleType] : [],
      },
    })

    await prisma.aIGeneration.create({
      data: {
        moduleType: moduleType ?? 'custom',
        provider: aiProvider.provider,
        model: result.model,
        prompt,
        output: fullContent,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
        userId,
        documentId: document.id,
      },
    })

    res.write(`data: ${JSON.stringify({ done: true, documentId: document.id })}\n\n`)
    res.end()
  }),

  // Async queue-based generation for large documents
  generateAsync: asyncHandler(async (req: Request, res: Response) => {
    const { prompt, systemPrompt, provider, model, moduleType, courseId, documentTitle } =
      req.body as {
        prompt: string
        systemPrompt?: string
        provider?: AIProviderID
        model?: string
        moduleType?: string
        courseId?: string
        documentTitle?: string
      }

    const jobId = uuidv4()
    const userId = req.user!.userId

    const dbJob = await prisma.job.create({
      data: {
        bullJobId: jobId,
        type: 'ai-generation',
        status: 'QUEUED',
        userId,
        payload: { prompt, moduleType, provider, model },
      },
    })

    await (await getAiQueue()).add('generate', {
      userId,
      moduleType: moduleType ?? 'custom',
      provider: provider ?? 'anthropic',
      model: model ?? 'claude-sonnet-4-6',
      prompt,
      systemPrompt,
      courseId,
      documentTitle,
      jobId,
    }, { jobId })

    res.status(202).json({ status: 'success', jobId: dbJob.bullJobId })
  }),

  // Poll job status
  getJobStatus: asyncHandler(async (req: Request, res: Response) => {
    const rawId = req.params.jobId
    const bullJobId: string = Array.isArray(rawId) ? rawId[0] : rawId
    const job = await prisma.job.findUnique({ where: { bullJobId } })
    if (!job) throw AppError.notFound('Job')
    if (job.userId !== req.user!.userId) throw AppError.forbidden()

    res.json({
      status: 'success',
      job: {
        id: job.bullJobId,
        status: job.status.toLowerCase(),
        result: job.result,
        error: job.error,
        createdAt: job.createdAt,
      },
    })
  }),

  getHistory: asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, pageSize = 20 } = req.query as { page?: number; pageSize?: number }
    const skip = (Number(page) - 1) * Number(pageSize)

    const [generations, count] = await Promise.all([
      prisma.aIGeneration.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
        select: { id: true, moduleType: true, provider: true, model: true, tokensInput: true, tokensOutput: true, durationMs: true, createdAt: true, documentId: true },
      }),
      prisma.aIGeneration.count({ where: { userId: req.user!.userId } }),
    ])

    res.json({ status: 'success', data: generations, count, page: Number(page), pageSize: Number(pageSize) })
  }),

  getUsage: asyncHandler(async (req: Request, res: Response) => {
    const usage = await prisma.aIUsage.groupBy({
      by: ['provider', 'moduleType'],
      where: { userId: req.user!.userId },
      _sum: { tokensInput: true, tokensOutput: true, costUsd: true },
    })

    res.json({ status: 'success', usage })
  }),
}
