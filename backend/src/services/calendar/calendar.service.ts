import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import type { CalendarEventType } from '@prisma/client'

interface CreateEventData {
  institutionId: string
  creatorId: string
  title: string
  description?: string
  eventType: CalendarEventType
  startAt: Date
  endAt: Date
  allDay?: boolean
  location?: string
  meetingUrl?: string
  attendees?: string[]
  workspaceId?: string
  entityType?: string
  entityId?: string
  color?: string
  recurrence?: unknown
}

export const calendarService = {
  async create(data: CreateEventData) {
    return prisma.calendarEvent.create({
      data: {
        institutionId: data.institutionId,
        workspaceId: data.workspaceId,
        creatorId: data.creatorId,
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay ?? false,
        location: data.location,
        meetingUrl: data.meetingUrl,
        attendees: (data.attendees ?? []) as never,
        entityType: data.entityType,
        entityId: data.entityId,
        color: data.color,
        recurrence: data.recurrence as never,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async getEvents(institutionId: string, userId: string, opts?: {
    from?: Date; to?: Date; workspaceId?: string; eventType?: CalendarEventType
  }) {
    const from = opts?.from ?? new Date()
    const to = opts?.to ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    return prisma.calendarEvent.findMany({
      where: {
        institutionId,
        startAt: { gte: from, lte: to },
        ...(opts?.workspaceId ? { workspaceId: opts.workspaceId } : {}),
        ...(opts?.eventType ? { eventType: opts.eventType } : {}),
        OR: [
          { creatorId: userId },
          { attendees: { array_contains: userId } },
          { workspaceId: { not: null } },
        ],
      },
      orderBy: { startAt: 'asc' },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async get(id: string) {
    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
    if (!event) throw AppError.notFound('Calendar event')
    return event
  },

  async update(id: string, userId: string, data: Partial<CreateEventData>) {
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!event) throw AppError.notFound('Calendar event')
    if (event.creatorId !== userId) throw AppError.forbidden('Only the creator can update this event')

    return prisma.calendarEvent.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        allDay: data.allDay,
        location: data.location,
        meetingUrl: data.meetingUrl,
        attendees: data.attendees as never,
        color: data.color,
      },
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async delete(id: string, userId: string) {
    const event = await prisma.calendarEvent.findUnique({ where: { id } })
    if (!event) throw AppError.notFound('Calendar event')
    if (event.creatorId !== userId) throw AppError.forbidden('Only the creator can delete this event')
    return prisma.calendarEvent.delete({ where: { id } })
  },

  async getUpcoming(institutionId: string, userId: string, limit = 5) {
    return prisma.calendarEvent.findMany({
      where: {
        institutionId,
        startAt: { gte: new Date() },
        OR: [{ creatorId: userId }, { attendees: { array_contains: userId } }],
      },
      orderBy: { startAt: 'asc' },
      take: limit,
    })
  },

  async getDueReminders() {
    const now = new Date()
    const in30 = new Date(now.getTime() + 30 * 60 * 1000)

    return prisma.calendarEvent.findMany({
      where: { startAt: { gte: now, lte: in30 }, reminderSent: false },
      include: { creator: { select: { id: true, email: true, name: true } } },
    })
  },

  async markReminderSent(id: string) {
    return prisma.calendarEvent.update({ where: { id }, data: { reminderSent: true } })
  },
}
