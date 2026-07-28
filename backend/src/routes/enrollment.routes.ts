import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.middleware'
import { enrollmentController } from '../controllers/enrollment.controller'

const router = Router()

// Student: browse available courses
router.get('/available',  authenticate, authorize('STUDENT'), enrollmentController.getAvailableCourses)
// Student: view own enrollments
router.get('/my',         authenticate, authorize('STUDENT'), enrollmentController.getMyEnrollments)
// Student: enroll
router.post('/',          authenticate, authorize('STUDENT'), enrollmentController.enroll)
// Student: drop
router.delete('/:courseId', authenticate, authorize('STUDENT'), enrollmentController.drop)
// Lecturer/admin: list enrolled students for a course
router.get('/course/:courseId/students', authenticate,
  authorize('LECTURER', 'TEACHING_ASSISTANT', 'DEPARTMENT_HEAD', 'DEAN', 'UNIVERSITY_ADMIN', 'ADMINISTRATOR'),
  enrollmentController.getCourseStudents,
)

export default router
