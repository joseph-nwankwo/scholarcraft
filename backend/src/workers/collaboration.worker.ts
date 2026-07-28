import net from 'net'
import { calendarService } from '../services/calendar/calendar.service'
import { notificationService } from '../services/notification/notification.service'
import { prisma } from '../config/database'

function checkRedis(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, host, () => { socket.destroy(); resolve(true) })
    socket.on('error', () => resolve(false))
    setTimeout(() => { socket.destroy(); resolve(false) }, 2000)
  })
}

async function startCollabWorkers() {
  const { env } = require('../config/env')
  const redisHost = env.REDIS_HOST ?? 'localhost'
  const redisPort = Number(env.REDIS_PORT ?? 6379)

  const available = await checkRedis(redisHost, redisPort)
  if (!available) {
    console.warn('[CollabWorker] Redis not available — collaboration workers disabled')
    return
  }

  try {
    const { Worker, Queue } = require('bullmq')
    const connection = { host: redisHost, port: redisPort }

    // ── Calendar Reminder Worker ──────────────────────────────────────
    const reminderWorker = new Worker(
      'calendar-reminders',
      async () => {
        const due = await calendarService.getDueReminders()
        for (const event of due) {
          await notificationService.create({
            userId: event.creatorId,
            type: 'CALENDAR_REMINDER',
            title: `Reminder: ${event.title}`,
            message: `Your event starts in 30 minutes`,
            category: 'CALENDAR',
            priority: 'HIGH',
            actionUrl: `/calendar/${event.id}`,
          })
          await calendarService.markReminderSent(event.id)

          const attendees = (event.attendees as string[]) ?? []
          for (const userId of attendees) {
            if (userId === event.creatorId) continue
            await notificationService.create({
              userId,
              type: 'CALENDAR_REMINDER',
              title: `Reminder: ${event.title}`,
              message: `You have an event starting in 30 minutes`,
              category: 'CALENDAR',
              priority: 'HIGH',
              actionUrl: `/calendar/${event.id}`,
            })
          }
        }
      },
      { connection }
    )

    // ── Notification Digest Worker ────────────────────────────────────
    const digestWorker = new Worker(
      'notification-digests',
      async () => {
        const users = await prisma.user.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, email: true, institutionId: true },
        })

        for (const user of users) {
          const unreadCount = await notificationService.getUnreadCount(user.id)
          if (unreadCount === 0) continue

          await notificationService.create({
            userId: user.id,
            type: 'ACTIVITY_DIGEST',
            title: 'Daily Digest',
            message: `You have ${unreadCount} unread notifications`,
            category: 'SYSTEM',
            priority: 'LOW',
            actionUrl: '/notifications',
          })
        }
      },
      { connection }
    )

    // ── Workspace Analytics Worker ────────────────────────────────────
    const analyticsWorker = new Worker(
      'workspace-analytics',
      async () => {
        // Aggregate workspace stats and message volumes
      },
      { connection }
    )

    // ── Recurring Schedules ───────────────────────────────────────────
    const reminderQueue = new Queue('calendar-reminders', { connection })
    const digestQueue = new Queue('notification-digests', { connection })
    const analyticsQueue = new Queue('workspace-analytics', { connection })

    reminderQueue.add('check', {}, { repeat: { pattern: '*/5 * * * *' } }).catch(() => null)
    digestQueue.add('daily', {}, { repeat: { pattern: '0 8 * * *' } }).catch(() => null)
    analyticsQueue.add('hourly', {}, { repeat: { pattern: '0 * * * *' } }).catch(() => null)

    reminderWorker.on('failed', (_job: unknown, err: Error) => {
      console.error('[CollabWorker] reminder failed:', err.message)
    })
    digestWorker.on('failed', (_job: unknown, err: Error) => {
      console.error('[CollabWorker] digest failed:', err.message)
    })
    analyticsWorker.on('failed', (_job: unknown, err: Error) => {
      console.error('[CollabWorker] analytics failed:', err.message)
    })

    console.log('[CollabWorker] BullMQ workers started')
  } catch (err: unknown) {
    const e = err as Error
    console.warn('[CollabWorker] BullMQ unavailable:', e.message)
  }
}

startCollabWorkers()
