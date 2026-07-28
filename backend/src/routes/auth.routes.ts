import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { authController } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { authLimiter } from '../middleware/rateLimiter'
import { env } from '../config/env'

function ssoOnly(_req: Request, res: Response, next: NextFunction) {
  if (env.DISABLE_DIRECT_SIGNUP) {
    res.status(403).json({
      status: 'error',
      message: 'Direct registration is disabled. Please sign up via uamsatech.com.',
    })
    return
  }
  next()
}

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed'))
  },
})

const router = Router()

const passwordSchema = z.string().min(8).max(128)
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[0-9]/, 'Must contain a number')

const registerInstitutionSchema = z.object({
  institution: z.object({
    name:     z.string().min(2).max(200),
    country:  z.string().optional(),
    timezone: z.string().optional(),
    domain:   z.string().optional(),
  }),
  owner: z.object({
    firstName: z.string().min(1).max(60),
    lastName:  z.string().min(1).max(60),
    email:     z.string().email(),
    password:  passwordSchema,
  }),
})

const registerSchema = z.object({
  name:          z.string().min(2).max(100),
  email:         z.string().email(),
  password:      passwordSchema,
  role:          z.enum(['STUDENT', 'LECTURER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'DEAN', 'UNIVERSITY_ADMIN', 'ADMINISTRATOR']).optional(),
  matricNumber:  z.string().max(30).optional(),
  institutionId: z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const forgotSchema        = z.object({ email: z.string().email() })
const resetSchema         = z.object({ token: z.string().min(1), password: passwordSchema })
const verifyEmailSchema   = z.object({ token: z.string().min(1) })
const resendVerifySchema  = z.object({ email: z.string().email() })
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     passwordSchema,
})

// ── SSO callback ─────────────────────────────────────────────────────────────
router.get('/sso', authController.ssoCallback)

// ── Public routes (rate limited) ─────────────────────────────────────────────
router.post('/register-institution', ssoOnly, authLimiter, validate(registerInstitutionSchema), authController.registerInstitution)
router.post('/register',             ssoOnly, authLimiter, validate(registerSchema),             authController.register)
router.post('/login',                authLimiter, validate(loginSchema),                authController.login)
router.post('/forgot-password',      authLimiter, validate(forgotSchema),               authController.forgotPassword)
router.post('/reset-password',       authLimiter, validate(resetSchema),                authController.resetPassword)
router.post('/verify-email',         authLimiter, validate(verifyEmailSchema),          authController.verifyEmail)
router.post('/resend-verification',  authLimiter, validate(resendVerifySchema),         authController.resendVerification)
router.post('/refresh',                                                                 authController.refresh)
router.post('/logout',                                                                  authController.logout)

// ── Protected routes ──────────────────────────────────────────────────────────
router.get ('/me',                authenticate, authController.me)
router.put ('/profile',           authenticate, authController.updateProfile)
router.post('/avatar',            authenticate, avatarUpload.single('avatar'),           authController.uploadAvatar)
router.post('/institution-logo',  authenticate, avatarUpload.single('institution-logo'),  authController.uploadInstitutionLogo)
router.put ('/password',          authenticate, validate(changePasswordSchema), authController.changePassword)
router.get ('/sessions',          authenticate, authController.getSessions)
router.delete('/sessions',        authenticate, authController.terminateAllSessions)
router.delete('/sessions/:sessionId', authenticate, authController.terminateSession)

export default router
