import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { outcomeController } from '../controllers/outcome.controller'

const router = Router()
router.use(authenticate)

router.get('/',                          outcomeController.list)
router.post('/',                         outcomeController.create)
router.get('/matrix/:courseId',          outcomeController.matrix)
router.get('/:id',                       outcomeController.get)
router.put('/:id',                       outcomeController.update)
router.delete('/:id',                    outcomeController.delete)

export default router
