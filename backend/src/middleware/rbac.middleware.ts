import type { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/database'
import { AppError } from '../utils/errors'

// ── Permission code constants ─────────────────────────────────────────────────
export const P = {
  COURSES_CREATE:    'courses:create',
  COURSES_READ:      'courses:read',
  COURSES_UPDATE:    'courses:update',
  COURSES_DELETE:    'courses:delete',
  COURSES_MANAGE:    'courses:manage',

  DOCS_CREATE:       'documents:create',
  DOCS_READ:         'documents:read',
  DOCS_UPDATE:       'documents:update',
  DOCS_DELETE:       'documents:delete',
  DOCS_APPROVE:      'documents:approve',

  AI_GENERATE:       'ai:generate',
  AI_CONFIGURE:      'ai:configure',
  AI_VIEW_USAGE:     'ai:view_usage',

  USERS_CREATE:      'users:create',
  USERS_READ:        'users:read',
  USERS_UPDATE:      'users:update',
  USERS_DELETE:      'users:delete',
  USERS_INVITE:      'users:invite',
  USERS_MANAGE_ROLES:'users:manage_roles',

  INSTITUTION_READ:  'institution:read',
  INSTITUTION_UPDATE:'institution:update',

  BILLING_READ:      'billing:read',
  BILLING_MANAGE:    'billing:manage',

  TEMPLATES_CREATE:  'templates:create',
  TEMPLATES_READ:    'templates:read',
  TEMPLATES_UPDATE:  'templates:update',
  TEMPLATES_DELETE:  'templates:delete',

  EXPORTS_CREATE:    'exports:create',
  EXPORTS_READ:      'exports:read',

  ANALYTICS_READ:    'analytics:read',
  ANALYTICS_EXPORT:  'analytics:export',

  AUDIT_READ:        'audit:read',

  SETTINGS_READ:     'settings:read',
  SETTINGS_UPDATE:   'settings:update',
} as const

export type PermissionCode = (typeof P)[keyof typeof P]

// Simple per-request permission cache (keyed by userId+institutionId)
const permCache = new Map<string, { codes: Set<string>; at: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min

async function getUserPermissions(userId: string, institutionId: string | null): Promise<Set<string>> {
  const key = `${userId}:${institutionId ?? 'none'}`
  const cached = permCache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.codes

  const assignments = await prisma.userRoleAssignment.findMany({
    where: {
      userId,
      role: { institutionId: institutionId ?? undefined },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  })

  const codes = new Set<string>()
  for (const a of assignments) {
    for (const rp of a.role.permissions) {
      codes.add(rp.permission.code)
    }
  }

  permCache.set(key, { codes, at: Date.now() })
  return codes
}

export function clearPermissionCache(userId: string) {
  for (const key of permCache.keys()) {
    if (key.startsWith(`${userId}:`)) permCache.delete(key)
  }
}

/** Require ALL listed permissions (AND). */
export function requirePermission(...permissions: PermissionCode[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized()

      // Institution owners (role slug = 'owner') bypass permission checks
      if (req.user.roleSlug === 'owner') return next()

      const userPerms = await getUserPermissions(req.user.userId, req.user.institutionId)

      const missing = permissions.filter((p) => !userPerms.has(p))
      if (missing.length > 0) {
        throw AppError.forbidden(`Missing permissions: ${missing.join(', ')}`)
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}

/** Require ANY of the listed permissions (OR). */
export function requireAnyPermission(...permissions: PermissionCode[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized()
      if (req.user.roleSlug === 'owner') return next()

      const userPerms = await getUserPermissions(req.user.userId, req.user.institutionId)
      const hasAny = permissions.some((p) => userPerms.has(p))

      if (!hasAny) {
        throw AppError.forbidden('Insufficient permissions')
      }
      next()
    } catch (err) {
      next(err)
    }
  }
}

/** Ensure request belongs to an institution. */
export function requireInstitution(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.institutionId) {
    throw AppError.forbidden('This action requires an institution account')
  }
  next()
}

/** Gate by role slug (e.g. 'owner', 'admin'). */
export function requireRole(...slugs: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw AppError.unauthorized()
    if (!slugs.includes(req.user.roleSlug)) {
      throw AppError.forbidden(`Requires one of roles: ${slugs.join(', ')}`)
    }
    next()
  }
}
