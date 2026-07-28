import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId:     string
      correlationId: string
      startTime:     [number, number]  // process.hrtime() tuple
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId     = (req.headers['x-request-id'] as string | undefined) ?? randomUUID()
  const correlationId = (req.headers['x-correlation-id'] as string | undefined) ?? requestId

  req.requestId     = requestId
  req.correlationId = correlationId
  req.startTime     = process.hrtime()

  res.setHeader('X-Request-ID',     requestId)
  res.setHeader('X-Correlation-ID', correlationId)

  next()
}
