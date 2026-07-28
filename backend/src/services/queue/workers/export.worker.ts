import { Worker } from 'bullmq'
import { getBullMQConnection } from '../../../config/redis'
import { enhancedExportService } from '../../export/enhanced-export.service'
import { logger } from '../../../utils/logger'
import type { ExportJobData } from '../queues'
import type { ExportFormat } from '../../export/enhanced-export.service'

export const exportWorker = new Worker<ExportJobData>(
  'document-export',
  async (job) => {
    const { exportId, documentId, userId, format } = job.data
    logger.info(`Processing export job ${job.id}`, { exportId, format })
    await enhancedExportService.processQueuedExport(exportId, documentId, userId, format as ExportFormat)
    return { exportId }
  },
  { connection: getBullMQConnection(), concurrency: 3 },
)

exportWorker.on('failed', (job, err) => {
  logger.error(`Export job ${job?.id} failed`, { error: (err as Error).message })
})
