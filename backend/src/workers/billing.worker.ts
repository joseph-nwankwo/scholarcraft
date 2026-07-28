import { logger } from '../utils/logger'
import net from 'net'

function checkRedis(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, host, () => { socket.destroy(); resolve(true) })
    socket.on('error', () => resolve(false))
    setTimeout(() => { socket.destroy(); resolve(false) }, 2000)
  })
}

async function startWorkers() {
  const { env } = await import('../config/env')
  const redisHost = env.REDIS_HOST ?? 'localhost'
  const redisPort = Number(env.REDIS_PORT ?? 6379)

  const available = await checkRedis(redisHost, redisPort)
  if (!available) {
    logger.warn('[billing-worker] Redis not available — billing workers disabled')
    return
  }

  try {
    const { Worker, Queue } = await import('bullmq')
    const connection = { host: redisHost, port: redisPort }

    const renewalWorker = new Worker(
      'billing:renewal',
      async (job) => {
        const { subscriptionService } = await import('../services/billing/subscription.service')
        if (job.name === 'expire-trials') {
          const count = await subscriptionService.processExpiredTrials()
          logger.info(`[billing-worker] Expired ${count} trials`)
          return { expired: count }
        }
        if (job.name === 'renew-subscription') {
          const { institutionId } = job.data as { institutionId: string }
          await subscriptionService.renewSubscription(institutionId)
        }
      },
      { connection },
    )

    const invoiceWorker = new Worker(
      'billing:invoices',
      async (job) => {
        if (job.name === 'generate-invoice') {
          const { invoiceService } = await import('../services/billing/invoice.service')
          const { subscriptionId, amount, currency, dueDate, notes } = job.data as {
            subscriptionId: string; amount: number; currency: string; dueDate: string; notes?: string
          }
          const invoice = await invoiceService.generateInvoice(subscriptionId, { amount, currency, dueDate: new Date(dueDate), notes })
          logger.info(`[billing-worker] Generated invoice ${invoice.invoiceNumber}`)
          return { invoiceId: invoice.id }
        }
      },
      { connection },
    )

    const usageWorker = new Worker(
      'billing:usage',
      async (job) => {
        if (job.name === 'aggregate-usage') {
          const { usageService } = await import('../services/billing/usage.service')
          const count = await usageService.aggregateAllInstitutions()
          return { processed: count }
        }
      },
      { connection },
    )

    const renewalQueue = new Queue('billing:renewal', { connection })
    const usageQueue = new Queue('billing:usage', { connection })

    renewalQueue.add('expire-trials', {}, { repeat: { pattern: '0 2 * * *' } }).catch(() => null)
    usageQueue.add('aggregate-usage', {}, { repeat: { pattern: '0 * * * *' } }).catch(() => null)

    logger.info('[billing-worker] Billing workers started')

    renewalWorker.on('failed', (job, err) => logger.warn('[billing-worker] Renewal job failed', { job: job?.id, err }))
    invoiceWorker.on('failed', (job, err) => logger.warn('[billing-worker] Invoice job failed', { job: job?.id, err }))
    usageWorker.on('failed', (job, err) => logger.warn('[billing-worker] Usage job failed', { job: job?.id, err }))
  } catch (err) {
    logger.warn('[billing-worker] Workers failed to start', { err: (err as Error).message })
  }
}

startWorkers()
