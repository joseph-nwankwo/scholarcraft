import { Router } from 'express'
import { z } from 'zod'
import { coursesController } from '../controllers/courses.controller'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'

const router = Router()

router.use(authenticate)

const courseSchema = z.object({
  title: z.string().min(1).max(200),
  code: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  level: z.string().min(1),
  credits: z.number().int().min(0).max(20).optional(),
  semester: z.string().optional(),
  academicYear: z.string().optional(),
  department: z.string().optional(),
  faculty: z.string().optional(),
})

router.get('/', coursesController.list)
router.post('/', validate(courseSchema), coursesController.create)
router.get('/:id', coursesController.get)
router.put('/:id', validate(courseSchema.partial()), coursesController.update)
router.delete('/:id', coursesController.delete)

export default router
