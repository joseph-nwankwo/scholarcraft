import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { questionController } from '../controllers/question.controller'

const router = Router()
router.use(authenticate)

router.get('/',                                    questionController.list)
router.post('/',                                   questionController.create)
router.get('/stats',                               questionController.stats)
router.post('/bulk-delete',                        questionController.bulkDelete)
router.post('/import',                             questionController.importBulk)
router.get('/:id',                                 questionController.get)
router.put('/:id',                                 questionController.update)
router.delete('/:id',                              questionController.delete)
router.post('/:id/duplicate',                      questionController.duplicate)
router.post('/:id/outcomes/:outcomeId',            questionController.mapOutcome)
router.delete('/:id/outcomes/:outcomeId',          questionController.unmapOutcome)

export default router
