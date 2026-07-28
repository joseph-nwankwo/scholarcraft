import { Router } from 'express'
import { z } from 'zod'
import { generateController } from '../controllers/generate.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'

const router = Router()
router.use(authenticate)

const generateSchema = z.object({
  topic:              z.string().min(1).max(500),
  subject:            z.string().optional(),
  courseId:           z.string().optional(),
  courseCode:         z.string().optional(),
  courseTitle:        z.string().optional(),
  academicLevel:      z.enum(['ND', 'HND', 'BSC', 'MSC', 'MBA', 'PHD', 'PROFESSIONAL']).default('BSC'),
  bloomLevel:         z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']).optional(),
  difficulty:         z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']).optional(),
  wordCount:          z.coerce.number().min(100).max(10000).optional(),
  duration:           z.coerce.number().min(15).max(360).optional(),
  teachingStyle:      z.string().optional(),
  language:           z.string().default('English'),
  tone:               z.string().optional(),
  referenceStyle:     z.string().optional(),
  includeExamples:    z.boolean().default(true),
  includeCaseStudies: z.boolean().default(false),
  includeExercises:   z.boolean().default(true),
  includeReferences:  z.boolean().default(true),
  customInstructions: z.string().max(2000).optional(),
  sourceContext:      z.string().max(60000).optional(),
  numberOfQuestions:  z.coerce.number().min(1).max(100).optional(),
  numberOfWeeks:      z.coerce.number().min(1).max(52).optional(),
  provider:           z.enum(['openai', 'anthropic', 'gemini']).optional(),
  model:              z.string().optional(),
  maxTokens:          z.coerce.number().min(512).max(16384).optional(),
  temperature:        z.coerce.number().min(0).max(2).optional(),
})

// Generator type routes
router.get('/types', generateController.listTypes)

// Streaming generation (SSE)
router.post('/:type/stream', aiLimiter, validate(generateSchema), generateController.stream)

// Async queue-based generation
router.post('/:type/async', aiLimiter, validate(generateSchema), generateController.async)

// Generation history & stats
router.get('/history', generateController.history)
router.get('/stats', generateController.stats)

// Document management
router.get('/documents',          generateController.listDocuments)
router.get('/documents/:id',      generateController.getDocument)
router.put('/documents/:id',      generateController.updateDocument)
router.delete('/documents/:id',   generateController.deleteDocument)

// Version management
router.get('/documents/:id/versions',                         generateController.listVersions)
router.post('/documents/:id/versions',                        generateController.createVersion)
router.post('/documents/:id/versions/:versionId/restore',     generateController.restoreVersion)

// Export
router.post('/documents/:id/export', generateController.exportDocument)

export default router
