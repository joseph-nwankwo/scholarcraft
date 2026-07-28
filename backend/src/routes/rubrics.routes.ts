import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { rubricController } from '../controllers/rubric.controller'

const router = Router()
router.use(authenticate)

router.get('/',      rubricController.list)
router.post('/',     rubricController.create)
router.get('/:id',   rubricController.get)
router.put('/:id',   rubricController.update)
router.delete('/:id', rubricController.delete)

export default router
