import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { reportsController } from '../controllers/reports.controller'

const router = Router()
router.use(authenticate)

// Templates
router.get('/templates',      reportsController.listTemplates)
router.post('/templates',     reportsController.createTemplate)
router.delete('/templates/:id', reportsController.deleteTemplate)

// Scheduled
router.get('/scheduled',      reportsController.listScheduled)
router.post('/scheduled',     reportsController.createScheduled)
router.patch('/scheduled/:id', reportsController.updateScheduled)
router.delete('/scheduled/:id', reportsController.deleteScheduled)

// Generation
router.get('/generate/teaching',    reportsController.generateTeaching)
router.get('/generate/assessment',  reportsController.generateAssessment)
router.get('/generate/ai-usage',    reportsController.generateAI)
router.get('/generate/institution', reportsController.generateInstitution)

export default router
