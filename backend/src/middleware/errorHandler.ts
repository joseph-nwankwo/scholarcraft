import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'
import { env } from '../config/env'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
    })
    return
  }

  // Unexpected errors
  logger.error('Unhandled error', { error: err.message, stack: err.stack })

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
}
