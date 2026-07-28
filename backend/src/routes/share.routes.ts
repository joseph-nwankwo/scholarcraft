import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { shareController } from '../controllers/share.controller'

const router = Router()

// Public endpoint — validate share link (no auth)
router.post('/validate/:token', shareController.validate)

// Authenticated routes
router.use(authenticate)
router.post('/document/:documentId',  shareController.create)
router.get('/document/:documentId',   shareController.list)
router.delete('/:id',                 shareController.revoke)

export default router
