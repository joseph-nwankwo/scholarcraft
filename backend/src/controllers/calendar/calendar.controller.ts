import type { Response } from 'express'
import type { Request } from 'express'
import { calendarService } from '../../services/calendar/calendar.service'
import { asyncHandler } from '../../utils/asyncHandler'
import type { CalendarEventType } from '@prisma/client'

export const calendarController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const { title, description, eventType, startAt, endAt, allDay, location, meetingUrl, attendees, workspaceId, entityType, entityId, color, recurrence } = req.body
    const event = await calendarService.create({
      institutionId: req.user!.institutionId!,
      creatorId: req.user!.userId,
      title, description,
      eventType: eventType as CalendarEventType,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      allDay, location, meetingUrl, attendees, workspaceId, entityType, entityId, color, recurrence,
    })
    res.status(201).json({ success: true, data: event })
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const events = await calendarService.getEvents(
      req.user!.institutionId!,
      req.user!.userId,
      {
        from: req.query.from ? new Date(req.query.from as string) : undefined,
        to: req.query.to ? new Date(req.query.to as string) : undefined,
        workspaceId: req.query.workspaceId as string | undefined,
        eventType: req.query.eventType as CalendarEventType | undefined,
      }
    )
    res.json({ success: true, data: events })
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const event = await calendarService.get(req.params.id as string)
    res.json({ success: true, data: event })
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const event = await calendarService.update(req.params.id as string, req.user!.userId, req.body)
    res.json({ success: true, data: event })
  }),

  delete: asyncHandler(async (req: Request, res: Response) => {
    await calendarService.delete(req.params.id as string, req.user!.userId)
    res.json({ success: true })
  }),

  getUpcoming: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5
    const events = await calendarService.getUpcoming(req.user!.institutionId!, req.user!.userId, limit)
    res.json({ success: true, data: events })
  }),
}
