import type { Request, Response, NextFunction } from 'express'
import { type ZodSchema, ZodError } from 'zod'
import { AppError } from '../utils/errors'

type Target = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target])
    if (!result.success) {
      const issues = (result.error as ZodError).issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join(', ')
      throw AppError.badRequest(`Validation error: ${issues}`, 'VALIDATION_ERROR')
    }
    req[target] = result.data
    next()
  }
}
