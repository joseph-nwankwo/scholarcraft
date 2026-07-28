import { Router } from 'express'
import { documentsController } from '../controllers/documents.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/', documentsController.list)
router.get('/:id', documentsController.get)
router.put('/:id', documentsController.update)
router.delete('/:id', documentsController.delete)

export default router
