import { Router } from 'express'
import { z } from 'zod'
import { aiController } from '../controllers/ai.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'

const router = Router()

router.use(authenticate)

const generateSchema = z.object({
  prompt: z.string().min(1).max(50000),
  systemPrompt: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'gemini']).optional(),
  model: z.string().optional(),
  moduleType: z.string().optional(),
  courseId: z.string().optional(),
  maxTokens: z.number().min(1).max(8192).optional(),
  temperature: z.number().min(0).max(2).optional(),
})

const asyncSchema = generateSchema.extend({
  documentTitle: z.string().optional(),
})

router.post('/stream', aiLimiter, validate(generateSchema), aiController.stream)
router.post('/generate-async', aiLimiter, validate(asyncSchema), aiController.generateAsync)
router.get('/jobs/:jobId', aiController.getJobStatus)
router.get('/history', aiController.getHistory)
router.get('/usage', aiController.getUsage)

export default router
