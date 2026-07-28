import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { AppError } from '../utils/errors'
import type { UserRole } from '@prisma/client'

export interface AuthPayload {
  userId: string
  email: string
  role: UserRole
  institutionId: string | null
  roleSlug: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. Bearer token in Authorization header
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  // 2. HttpOnly cookie
  if (req.cookies?.sc_access) return req.cookies.sc_access as string
  return null
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) throw AppError.unauthorized('Authentication required')

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload
    req.user = payload
    next()
  } catch {
    throw AppError.unauthorized('Invalid or expired token')
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req)
  if (!token) return next()

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload
    req.user = payload
  } catch {
    // ignore — optional
  }
  next()
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized()
    if (roles.length && !roles.includes(req.user.role)) {
      throw AppError.forbidden('Insufficient permissions')
    }
    next()
  }
}
