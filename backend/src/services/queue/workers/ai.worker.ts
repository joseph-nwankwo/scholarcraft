import { Worker } from 'bullmq'
import { getBullMQConnection } from '../../../config/redis'
import { prisma } from '../../../config/database'
import { AIProviderFactory } from '../../ai/factory'
import { logger } from '../../../utils/logger'
import type { AIJobData } from '../queues'
import type { AIProviderID } from '../../ai/types'

export const aiWorker = new Worker<AIJobData>(
  'ai-generation',
  async (job) => {
    const { userId, moduleType, provider, model, prompt, systemPrompt, courseId, documentTitle, jobId } = job.data

    logger.info(`Processing AI job ${job.id}`, { userId, moduleType, provider })

    await prisma.job.update({
      where: { bullJobId: jobId },
      data: { status: 'ACTIVE' },
    })

    const aiProvider = AIProviderFactory.create(provider as AIProviderID)
    let fullContent = ''

    const result = await aiProvider.stream(
      { prompt, systemPrompt, model, maxTokens: 8192 },
      (chunk) => { fullContent += chunk }
    )

    const document = await prisma.document.create({
      data: {
        title: documentTitle ?? `${moduleType} — ${new Date().toLocaleDateString()}`,
        type: mapModuleToDocType(moduleType),
        content: result.content,
        userId,
        courseId,
        tags: [moduleType],
      },
    })

    await prisma.aIGeneration.create({
      data: {
        moduleType,
        provider,
        model: result.model,
        prompt,
        output: result.content,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
        userId,
        documentId: document.id,
      },
    })

    await prisma.job.update({
      where: { bullJobId: jobId },
      data: { status: 'COMPLETED', result: { documentId: document.id } },
    })

    return { documentId: document.id }
  },
  { connection: getBullMQConnection(), concurrency: 5 }
)

aiWorker.on('failed', async (job, err) => {
  logger.error(`AI job ${job?.id} failed`, { error: err.message })
  if (job?.data.jobId) {
    await prisma.job.update({
      where: { bullJobId: job.data.jobId },
      data: { status: 'FAILED', error: err.message },
    }).catch(() => {})
  }
})

function mapModuleToDocType(moduleType: string): 'LECTURE_NOTE' | 'QUESTION_SET' | 'ASSIGNMENT' | 'EXAM' | 'RUBRIC' | 'COURSE_OUTLINE' | 'PRESENTATION' {
  const map: Record<string, 'LECTURE_NOTE' | 'QUESTION_SET' | 'ASSIGNMENT' | 'EXAM' | 'RUBRIC' | 'COURSE_OUTLINE' | 'PRESENTATION'> = {
    'lecture-notes': 'LECTURE_NOTE',
    'questions': 'QUESTION_SET',
    'assignment': 'ASSIGNMENT',
    'exam': 'EXAM',
    'rubric': 'RUBRIC',
    'course-outline': 'COURSE_OUTLINE',
    'presentation': 'PRESENTATION',
  }
  return map[moduleType] ?? 'LECTURE_NOTE'
}
