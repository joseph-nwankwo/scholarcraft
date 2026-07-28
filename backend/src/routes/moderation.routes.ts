import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { moderationController } from '../controllers/moderation.controller'

const router = Router()
router.use(authenticate)

router.get('/queue',                             moderationController.queue)
router.get('/stats',                             moderationController.stats)
router.post('/questions/:questionId/submit',     moderationController.submit)
router.get('/questions/:questionId/history',     moderationController.history)
router.post('/questions/:questionId/approve',    moderationController.approve)
router.post('/questions/:questionId/reject',     moderationController.reject)
router.post('/questions/:questionId/revise',     moderationController.requestRevision)

export default router
