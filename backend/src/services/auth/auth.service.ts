import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { signAccessToken, createRefreshToken } from './jwt.service'
import { roleService } from '../role/role.service'
import { emailService } from '../email/email.service'
import { auditService } from '../audit/audit.service'
import type { UserRole } from '@prisma/client'

const SALT_ROUNDS    = 12
const MAX_ATTEMPTS   = 5
const LOCKOUT_MS     = 15 * 60 * 1000       // 15 min
const RESET_TTL_MS   = 60 * 60 * 1000       // 1 hr
const VERIFY_TTL_MS  = 24 * 60 * 60 * 1000  // 24 hr

const PRODUCT              = 'scholarcraft' as const
const PRODUCT_DEFAULT_ROLE = 'STUDENT'      as const

// ── Helpers ───────────────────────────────────────────────────────────────────

function secureToken() {
  return crypto.randomBytes(32).toString('hex')
}

function sanitizeUser(user: {
  id: string; name: string; firstName: string | null; lastName: string | null;
  email: string; role: UserRole; status: string; emailVerified: boolean;
  department: string | null; faculty: string | null; title: string | null;
  avatarUrl: string | null; bio: string | null; institutionId: string | null;
  lastLogin: Date | null;
  personalInstitutionName?: string | null;
  personalInstitutionMotto?: string | null;
  personalInstitutionLogoUrl?: string | null;
  personalInstitutionType?: string | null;
}, roleSlug = 'lecturer') {
  return {
    id: user.id, name: user.name, firstName: user.firstName, lastName: user.lastName,
    email: user.email, role: user.role, status: user.status, emailVerified: user.emailVerified,
    department: user.department, faculty: user.faculty, title: user.title,
    avatarUrl: user.avatarUrl, bio: user.bio, institutionId: user.institutionId,
    lastLogin: user.lastLogin, roleSlug,
    personalInstitutionName:    user.personalInstitutionName    ?? null,
    personalInstitutionMotto:   user.personalInstitutionMotto   ?? null,
    personalInstitutionLogoUrl: user.personalInstitutionLogoUrl ?? null,
    personalInstitutionType:    user.personalInstitutionType    ?? null,
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface RegisterInstitutionInput {
  institution: { name: string; country?: string; timezone?: string; domain?: string }
  owner: { firstName: string; lastName: string; email: string; password: string }
}

export interface LoginInput { email: string; password: string; ip?: string; userAgent?: string }

export const authService = {
  // ── Registration ───────────────────────────────────────────────────────────

  async registerInstitution(input: RegisterInstitutionInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.owner.email.toLowerCase() } })
    if (existing) throw AppError.conflict('An account with this email already exists')

    const hashed   = await bcrypt.hash(input.owner.password, SALT_ROUNDS)
    const fullName = `${input.owner.firstName} ${input.owner.lastName}`

    // Create institution + owner in transaction
    const { institution, user } = await prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: {
          name:     input.institution.name,
          domain:   input.institution.domain ?? null,
          country:  input.institution.country  ?? 'Nigeria',
          timezone: input.institution.timezone ?? 'Africa/Lagos',
        },
      })

      const user = await tx.user.create({
        data: {
          email:         input.owner.email.toLowerCase(),
          password:      hashed,
          name:          fullName,
          firstName:     input.owner.firstName,
          lastName:      input.owner.lastName,
          role:          'ADMINISTRATOR',
          status:        'PENDING_VERIFICATION',
          institutionId: institution.id,
        },
      })

      return { institution, user }
    })

    // Seed permissions + roles for the new institution
    await roleService.seedPermissions()
    await roleService.createDefaultRoles(institution.id)
    await roleService.assignRole(user.id, institution.id, 'owner')

    // Send verification email
    const verifyToken = secureToken()
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, institutionId: institution.id, token: verifyToken, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    })
    await emailService.sendVerification(user.email, user.firstName ?? user.name, verifyToken)

    await auditService.log({ userId: user.id, institutionId: institution.id, action: 'auth.register_institution' })

    return { institution, user: sanitizeUser(user, 'owner') }
  },

  async register(input: { name: string; email: string; password: string; role?: UserRole; institutionId?: string; matricNumber?: string }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (existing) throw AppError.conflict('An account with this email already exists')

    const role   = input.role ?? 'STUDENT'
    const hashed = await bcrypt.hash(input.password, SALT_ROUNDS)
    const user   = await prisma.user.create({
      data: {
        name:          input.name,
        email:         input.email.toLowerCase(),
        password:      hashed,
        role,
        institutionId: input.institutionId ?? null,
        status:        'ACTIVE',
        // Store matric number in the department field for students (simple approach)
        ...(role === 'STUDENT' && input.matricNumber ? { department: input.matricNumber } : {}),
      },
    })

    await auditService.log({ userId: user.id, institutionId: user.institutionId ?? undefined, action: 'auth.register' })

    const roleSlug    = role.toLowerCase()
    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role, institutionId: user.institutionId, roleSlug })
    const refreshToken = await createRefreshToken(user.id)

    return { user: sanitizeUser(user, roleSlug), tokens: { accessToken, refreshToken } }
  },

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (!user) throw AppError.unauthorized('Invalid email or password')

    // Lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000)
      throw AppError.unauthorized(`Account locked. Try again in ${mins} minute(s)`)
    }

    const valid = await bcrypt.compare(input.password, user.password)
    if (!valid) {
      const newAttempts = user.failedAttempts + 1
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: newAttempts,
          lockedUntil: newAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
        },
      })
      throw AppError.unauthorized('Invalid email or password')
    }

    if (user.status === 'SUSPENDED') throw AppError.forbidden('Your account has been suspended')
    if (user.status === 'INACTIVE')  throw AppError.forbidden('Your account is inactive')

    // Reset failed attempts + update lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    })

    const productRole = await prisma.userProductRole.upsert({
      where:  { userId_product: { userId: user.id, product: PRODUCT } },
      create: { userId: user.id, product: PRODUCT, role: PRODUCT_DEFAULT_ROLE },
      update: {},
    })
    const role     = productRole.role
    const roleSlug = role === 'STUDENT'
      ? 'student'
      : user.institutionId
        ? await roleService.getPrimaryRoleSlug(user.id, user.institutionId)
        : 'lecturer'

    const accessToken  = signAccessToken({ userId: user.id, email: user.email, role, institutionId: user.institutionId, roleSlug })
    const refreshToken = await createRefreshToken(user.id)

    // Create session
    const sessionToken = uuidv4()
    await prisma.loginSession.create({
      data: {
        userId:       user.id,
        institutionId: user.institutionId ?? null,
        sessionToken,
        userAgent:   input.userAgent ?? null,
        ip:          input.ip       ?? null,
        expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    await auditService.log({ userId: user.id, institutionId: user.institutionId ?? undefined, action: 'auth.login', ip: input.ip, userAgent: input.userAgent })

    return {
      user: sanitizeUser(user, roleSlug),
      tokens: { accessToken, refreshToken },
      institution: user.institutionId
        ? await prisma.institution.findUnique({ where: { id: user.institutionId }, select: { id: true, name: true, logo: true, planTier: true, institutionType: true } })
        : null,
    }
  },

  // ── Password Reset ─────────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user) return // silent — don't expose whether email exists

    // Invalidate existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = secureToken()
    await prisma.passwordResetToken.create({
      data: { userId: user.id, institutionId: user.institutionId ?? null, token, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    })

    await emailService.sendPasswordReset(user.email, user.firstName ?? user.name, token)
    await auditService.log({ userId: user.id, institutionId: user.institutionId ?? undefined, action: 'auth.password_reset_request' })
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token }, include: { user: true } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppError.badRequest('Invalid or expired password reset link')
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { password: hashed, failedAttempts: 0, lockedUntil: null } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ])

    await auditService.log({ userId: record.userId, institutionId: record.institutionId ?? undefined, action: 'auth.password_reset' })
  },

  // ── Email Verification ─────────────────────────────────────────────────────

  async verifyEmail(token: string) {
    const record = await prisma.emailVerificationToken.findUnique({ where: { token }, include: { user: true } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw AppError.badRequest('Invalid or expired verification link')
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true, status: 'ACTIVE' } }),
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ])

    await emailService.sendWelcome(
      record.user.email,
      record.user.firstName ?? record.user.name,
      (await prisma.institution.findUnique({ where: { id: record.institutionId ?? '' }, select: { name: true } }))?.name ?? 'LectureCraft'
    )

    await auditService.log({ userId: record.userId, institutionId: record.institutionId ?? undefined, action: 'auth.email_verified' })
  },

  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || user.emailVerified) return // silent

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
    const token = secureToken()
    await prisma.emailVerificationToken.create({
      data: { userId: user.id, institutionId: user.institutionId ?? null, token, expiresAt: new Date(Date.now() + VERIFY_TTL_MS) },
    })
    await emailService.sendVerification(user.email, user.firstName ?? user.name, token)
  },

  // ── Profile ────────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        institution: { select: { id: true, name: true, logo: true, planTier: true, tenantStatus: true, institutionType: true } },
        roleAssignments: { include: { role: { select: { slug: true, name: true } } } },
      },
    })
    if (!user) throw AppError.notFound('User')
    const roleSlug = user.role === 'STUDENT'
      ? 'student'
      : user.roleAssignments[0]?.role.slug ?? 'lecturer'
    return { ...sanitizeUser(user, roleSlug), institution: user.institution, roles: user.roleAssignments.map((r) => r.role) }
  },

  async updateProfile(userId: string, data: { name?: string; firstName?: string; lastName?: string; department?: string; faculty?: string; title?: string; bio?: string; personalInstitutionName?: string; personalInstitutionMotto?: string; personalInstitutionType?: string }) {
    if (data.firstName && data.lastName && !data.name) {
      data.name = `${data.firstName} ${data.lastName}`
    }
    const { personalInstitutionType, ...rest } = data
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(personalInstitutionType !== undefined && {
          personalInstitutionType: personalInstitutionType as import('@prisma/client').InstitutionType,
        }),
      },
    })
    await auditService.log({ userId, action: 'auth.password_changed', newValue: { fields: Object.keys(data) } })
    return sanitizeUser(user)
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw AppError.notFound('User')

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) throw AppError.badRequest('Current password is incorrect')

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    await prisma.refreshToken.deleteMany({ where: { userId } })
    await auditService.log({ userId, institutionId: user.institutionId ?? undefined, action: 'auth.password_changed' })
  },

  // ── Sessions ───────────────────────────────────────────────────────────────

  async getSessions(userId: string) {
    return prisma.loginSession.findMany({
      where: { userId, isRevoked: false, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: 'desc' },
    })
  },

  async terminateSession(userId: string, sessionId: string) {
    await prisma.loginSession.updateMany({
      where: { id: sessionId, userId },
      data: { isRevoked: true },
    })
    await auditService.log({ userId, action: 'auth.session_terminated', resourceId: sessionId })
  },

  async terminateAllSessions(userId: string) {
    await prisma.loginSession.updateMany({ where: { userId }, data: { isRevoked: true } })
    await prisma.refreshToken.deleteMany({ where: { userId } })
    await auditService.log({ userId, action: 'auth.session_terminated', metadata: { all: true } })
  },
}
