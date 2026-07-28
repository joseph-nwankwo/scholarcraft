import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { libraryController } from '../controllers/library.controller'

const router = Router()
router.use(authenticate)

router.get('/',           libraryController.list)
router.get('/recent',     libraryController.recent)
router.get('/stats',      libraryController.stats)
router.get('/search',     libraryController.search)
router.post('/move',      libraryController.move)
router.delete('/trash',   libraryController.emptyTrash)

router.post('/:id/pin',           libraryController.pin)
router.post('/:id/trash',         libraryController.trash)
router.post('/:id/restore',       libraryController.restore)
router.delete('/:id/permanent',   libraryController.permanentDelete)
router.post('/:id/favorite',      libraryController.favorite)

export default router
