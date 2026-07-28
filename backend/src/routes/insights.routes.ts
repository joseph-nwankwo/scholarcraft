import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { insightsController } from '../controllers/insights.controller'

const router = Router()
router.use(authenticate)

router.get('/lecturer',    insightsController.lecturerInsights)
router.get('/institution', insightsController.institutionInsights)
router.get('/bloom',       insightsController.bloomInsights)
router.get('/assessment',  insightsController.assessmentInsights)

export default router
