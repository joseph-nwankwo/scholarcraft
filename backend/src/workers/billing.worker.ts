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
        // AS-P0-SECURITY-006A: commercial subscription jobs are central-only.
        // 'expire-trials' (TRIALING → PAST_DUE) and 'renew-subscription'
        // (period roll-forward without payment) are refused without touching
        // any record; a schedule already stored in Redis is drained harmlessly.
        if (job.name === 'expire-trials' || job.name === 'renew-subscription') {
          logger.warn(`[billing-worker] '${job.name}' is disabled: billing is managed by the UAMSA Tech portal`)
          return { skipped: true, reason: 'billing_managed_centrally' }
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

    // AS-P0-SECURITY-006A: 'expire-trials' is no longer scheduled (it was
    // registered by BOTH products against the shared craftsuite database).
    // Remove a schedule left in Redis by an earlier release (best effort).
    renewalQueue.removeRepeatable('expire-trials', { pattern: '0 2 * * *' }).catch(() => null)
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
