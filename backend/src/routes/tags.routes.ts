import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { tagsController } from '../controllers/tags.controller'

const router = Router()
router.use(authenticate)

router.get('/',                             tagsController.list)
router.post('/',                            tagsController.create)
router.delete('/:id',                       tagsController.delete)
router.post('/attach',                      tagsController.attach)
router.post('/detach',                      tagsController.detach)
router.get('/document/:documentId',         tagsController.getDocumentTags)

export default router
