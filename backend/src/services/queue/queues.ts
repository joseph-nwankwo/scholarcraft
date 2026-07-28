import { Queue } from 'bullmq'
import { getBullMQConnection } from '../../config/redis'

const connection = { ...getBullMQConnection(), lazyConnect: true, retryStrategy: () => null }

export const aiQueue = new Queue('ai-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 * 24 },
    removeOnFail: { age: 3600 * 24 * 7 },
  },
})
aiQueue.on('error', (err) => console.warn('[aiQueue] Redis unavailable:', err.message))

export const exportQueue = new Queue('document-export', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 3600 * 24 },
  },
})
exportQueue.on('error', (err) => console.warn('[exportQueue] Redis unavailable:', err.message))

export type AIJobData = {
  userId: string
  moduleType: string
  provider: string
  model: string
  prompt: string
  systemPrompt?: string
  courseId?: string
  documentTitle?: string
  jobId: string
}

export type ExportJobData = {
  userId: string
  documentId: string
  format: string
  exportId: string
}
