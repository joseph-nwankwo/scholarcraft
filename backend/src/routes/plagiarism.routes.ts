import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'
import { plagiarismController } from '../controllers/plagiarism.controller'

const router = Router()

router.use(authenticate)

const checkSchema = z.object({
  text: z.string().min(50, 'Text must be at least 50 characters').max(50000),
  title: z.string().max(200).optional(),
  checks: z.array(z.enum(['ai', 'plagiarism'])).min(1).default(['ai', 'plagiarism']),
})

router.post('/check', aiLimiter, validate(checkSchema), plagiarismController.check)
router.get('/history', plagiarismController.history)

export default router
