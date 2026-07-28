import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { foldersController } from '../controllers/folders.controller'

const router = Router()
router.use(authenticate)

router.get('/tree', foldersController.tree)
router.get('/',     foldersController.list)
router.post('/',    foldersController.create)
router.put('/:id',  foldersController.update)
router.delete('/:id', foldersController.delete)

export default router
