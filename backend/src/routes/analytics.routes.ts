import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { analyticsController } from '../controllers/analytics.controller'

const router = Router()
router.use(authenticate)

router.get('/dashboard',    analyticsController.dashboard)
router.get('/lecturer/:userId', analyticsController.lecturerDashboard)
router.get('/department',   analyticsController.departmentDashboard)
router.get('/faculty',      analyticsController.facultyDashboard)
router.get('/institution',  analyticsController.institutionDashboard)
router.get('/ai-usage',     analyticsController.aiUsage)
router.get('/documents',    analyticsController.documentStats)
router.get('/assessments',  analyticsController.assessmentStats)
router.get('/approvals',    analyticsController.approvalStats)
router.get('/bloom',        analyticsController.bloomCoverage)
router.get('/productivity', analyticsController.productivity)
router.post('/events',      analyticsController.trackEvent)

export default router
