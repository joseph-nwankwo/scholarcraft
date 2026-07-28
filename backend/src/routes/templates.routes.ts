import { Router } from 'express'
import { templateController } from '../controllers/template.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)

router.get('/',        templateController.list)
router.get('/:id',     templateController.get)
router.post('/',       templateController.create)
router.put('/:id',     templateController.update)
router.delete('/:id',  templateController.delete)

export default router
