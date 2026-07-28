import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { approvalController } from '../controllers/approval.controller'

const router = Router()
router.use(authenticate)

router.get('/queue',                        approvalController.queue)
router.post('/document/:documentId/submit', approvalController.submit)
router.get('/document/:documentId/history', approvalController.history)
router.post('/:id/approve',                 approvalController.approve)
router.post('/:id/reject',                  approvalController.reject)
router.post('/:id/request-changes',         approvalController.requestChanges)

export default router
