import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { assessmentController } from '../controllers/assessment.controller'

const router = Router()
router.use(authenticate)

router.get('/',                                    assessmentController.list)
router.post('/',                                   assessmentController.create)
router.get('/stats',                               assessmentController.stats)
router.get('/:id',                                 assessmentController.get)
router.put('/:id',                                 assessmentController.update)
router.delete('/:id',                              assessmentController.delete)
router.post('/:id/publish',                        assessmentController.publish)
router.post('/:id/archive',                        assessmentController.archive)
router.post('/:id/questions',                      assessmentController.addQuestion)
router.delete('/:id/questions/:questionId',        assessmentController.removeQuestion)
router.put('/:id/questions/reorder',               assessmentController.reorderQuestions)
router.post('/:id/outcomes/:outcomeId',            assessmentController.mapOutcome)
router.delete('/:id/outcomes/:outcomeId',          assessmentController.unmapOutcome)

export default router
