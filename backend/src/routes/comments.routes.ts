import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { commentsController } from '../controllers/comments.controller'

const router = Router()
router.use(authenticate)

// Document-scoped comments
router.get('/document/:documentId',    commentsController.list)
router.post('/document/:documentId',   commentsController.create)

// Comment actions
router.put('/:id',             commentsController.update)
router.delete('/:id',          commentsController.delete)
router.post('/:id/resolve',    commentsController.resolve)
router.post('/:id/unresolve',  commentsController.unresolve)

export default router
