import { Router } from 'express'
import multer from 'multer'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { submissionController } from '../controllers/submission.controller'

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

const router = Router()

// Student routes
router.get('/my',                    authenticate, authorize('STUDENT'), submissionController.getMySubmissions)
router.get('/:assessmentId',         authenticate, authorize('STUDENT'), submissionController.getSubmission)
router.post('/:assessmentId/draft',  authenticate, authorize('STUDENT'), upload.single('file'), submissionController.saveDraft)
router.post('/:assessmentId/submit', authenticate, authorize('STUDENT'), submissionController.submit)

// Lecturer / staff routes
router.get('/assignment/:assessmentId/all', authenticate,
  authorize('LECTURER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'DEAN', 'UNIVERSITY_ADMIN', 'ADMINISTRATOR'),
  submissionController.getAssignmentSubmissions,
)
router.patch('/:id/grade',  authenticate,
  authorize('LECTURER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'DEAN', 'UNIVERSITY_ADMIN', 'ADMINISTRATOR'),
  submissionController.grade,
)
router.patch('/:id/return', authenticate,
  authorize('LECTURER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'DEAN', 'UNIVERSITY_ADMIN', 'ADMINISTRATOR'),
  submissionController.returnSubmission,
)

export default router
