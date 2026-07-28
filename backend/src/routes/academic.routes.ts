import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { requirePermission, requireInstitution, P } from '../middleware/rbac.middleware'
import { validate } from '../middleware/validate'
import {
  facultyController,
  departmentController,
  programmeController,
  academicSessionController,
  courseController,
} from '../controllers/academic.controller'

const router = Router()

router.use(authenticate, requireInstitution)

// ── Validation schemas ─────────────────────────────────────────────────────────

const facultySchema = z.object({
  name:         z.string().min(2).max(200),
  abbreviation: z.string().max(20).optional(),
  code:         z.string().min(1).max(20).toUpperCase(),
  description:  z.string().max(1000).optional(),
  logo:         z.string().url().optional(),
  deanId:       z.string().optional(),
})

const departmentSchema = z.object({
  facultyId:    z.string().min(1),
  name:         z.string().min(2).max(200),
  abbreviation: z.string().max(20).optional(),
  code:         z.string().min(1).max(20).toUpperCase(),
  description:  z.string().max(1000).optional(),
  hodId:        z.string().optional(),
})

const programmeSchema = z.object({
  departmentId:        z.string().min(1),
  name:                z.string().min(2).max(200),
  abbreviation:        z.string().max(20).optional(),
  degree:              z.string().min(1).max(50),
  duration:            z.number().int().min(1).max(10).optional(),
  studyMode:           z.enum(['FULL_TIME', 'PART_TIME', 'DISTANCE', 'BLENDED']).optional(),
  accreditationStatus: z.enum(['PENDING', 'ACCREDITED', 'PROVISIONAL', 'REVOKED']).optional(),
})

const sessionSchema = z.object({
  name:      z.string().min(2).max(50),
  startDate: z.string().datetime({ offset: true }).or(z.string().date()),
  endDate:   z.string().datetime({ offset: true }).or(z.string().date()),
  current:   z.boolean().optional(),
})

const semesterSchema = z.object({
  academicSessionId: z.string().min(1),
  name:      z.string().min(2).max(100),
  number:    z.number().int().min(1).max(3),
  startDate: z.string(),
  endDate:   z.string(),
  current:   z.boolean().optional(),
})

const courseSchema = z.object({
  departmentId: z.string().min(1),
  programmeId:  z.string().optional(),
  semesterId:   z.string().optional(),
  code:         z.string().min(1).max(20).toUpperCase(),
  title:        z.string().min(2).max(300),
  description:  z.string().max(2000).optional(),
  creditUnits:  z.number().int().min(1).max(12).optional(),
  level:        z.enum(['L100', 'L200', 'L300', 'L400', 'L500', 'L600', 'L700', 'POSTGRADUATE']),
  courseType:   z.enum(['COMPULSORY', 'ELECTIVE', 'GENERAL']).optional(),
  learningHours: z.number().int().optional(),
  deliveryMode: z.enum(['FACE_TO_FACE', 'ONLINE', 'HYBRID']).optional(),
})

const assignLecturerSchema = z.object({
  lecturerId:        z.string().min(1),
  academicSessionId: z.string().min(1),
  semesterId:        z.string().optional(),
  role:              z.enum(['LEAD', 'ASSISTANT', 'SUPERVISOR']).optional(),
})

const outcomeSchema = z.object({
  outcomeCode:  z.string().min(1).max(20),
  description:  z.string().min(5),
  bloomLevel:   z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYSE', 'EVALUATE', 'CREATE']),
})

const scheduleSchema = z.object({
  lecturerId:  z.string().min(1),
  semesterId:  z.string().optional(),
  venue:       z.string().max(100).optional(),
  day:         z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  startTime:   z.string().regex(/^\d{2}:\d{2}$/),
  endTime:     z.string().regex(/^\d{2}:\d{2}$/),
  weekPattern: z.enum(['EVERY_WEEK', 'ODD_WEEKS', 'EVEN_WEEKS']).optional(),
})

const materialSchema = z.object({
  title:      z.string().min(2).max(200),
  fileUrl:    z.string().url(),
  fileType:   z.string().min(1),
  fileSize:   z.number().int().optional(),
  visibility: z.enum(['PUBLIC', 'ENROLLED', 'INSTRUCTORS_ONLY']).optional(),
})

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) })

// ── Faculty routes ─────────────────────────────────────────────────────────────

router.get   ('/faculties',              requirePermission(P.COURSES_READ), facultyController.list)
router.get   ('/faculties/:id',          requirePermission(P.COURSES_READ), facultyController.get)
router.get   ('/faculties/:id/stats',    requirePermission(P.COURSES_READ), facultyController.stats)
router.post  ('/faculties',              requirePermission(P.COURSES_CREATE), validate(facultySchema), facultyController.create)
router.put   ('/faculties/:id',          requirePermission(P.COURSES_UPDATE), validate(facultySchema.partial()), facultyController.update)
router.delete('/faculties/:id',          requirePermission(P.COURSES_DELETE), facultyController.delete)

// ── Department routes ──────────────────────────────────────────────────────────

router.get   ('/departments',            requirePermission(P.COURSES_READ), departmentController.list)
router.get   ('/departments/:id',        requirePermission(P.COURSES_READ), departmentController.get)
router.post  ('/departments',            requirePermission(P.COURSES_CREATE), validate(departmentSchema), departmentController.create)
router.put   ('/departments/:id',        requirePermission(P.COURSES_UPDATE), validate(departmentSchema.partial()), departmentController.update)
router.delete('/departments/:id',        requirePermission(P.COURSES_DELETE), departmentController.delete)

// ── Programme routes ───────────────────────────────────────────────────────────

router.get   ('/programmes',             requirePermission(P.COURSES_READ), programmeController.list)
router.get   ('/programmes/:id',         requirePermission(P.COURSES_READ), programmeController.get)
router.post  ('/programmes',             requirePermission(P.COURSES_CREATE), validate(programmeSchema), programmeController.create)
router.put   ('/programmes/:id',         requirePermission(P.COURSES_UPDATE), validate(programmeSchema.partial()), programmeController.update)
router.delete('/programmes/:id',         requirePermission(P.COURSES_DELETE), programmeController.delete)

// ── Academic Session routes ────────────────────────────────────────────────────

router.get   ('/sessions',               requirePermission(P.COURSES_READ), academicSessionController.listSessions)
router.get   ('/sessions/:id',           requirePermission(P.COURSES_READ), academicSessionController.getSession)
router.post  ('/sessions',               requirePermission(P.COURSES_CREATE), validate(sessionSchema), academicSessionController.createSession)
router.put   ('/sessions/:id',           requirePermission(P.COURSES_UPDATE), validate(sessionSchema.partial()), academicSessionController.updateSession)
router.delete('/sessions/:id',           requirePermission(P.COURSES_DELETE), academicSessionController.deleteSession)

// ── Semester routes ───────────────────────────────────────────────────────────

router.get   ('/semesters',              requirePermission(P.COURSES_READ), academicSessionController.listSemesters)
router.get   ('/semesters/current',      requirePermission(P.COURSES_READ), academicSessionController.currentSemester)
router.get   ('/semesters/:semesterId',  requirePermission(P.COURSES_READ), academicSessionController.getSemester)
router.post  ('/semesters',             requirePermission(P.COURSES_CREATE), validate(semesterSchema), academicSessionController.createSemester)
router.put   ('/semesters/:semesterId',  requirePermission(P.COURSES_UPDATE), validate(semesterSchema.partial()), academicSessionController.updateSemester)
router.delete('/semesters/:semesterId',  requirePermission(P.COURSES_DELETE), academicSessionController.deleteSemester)

// ── Course routes ──────────────────────────────────────────────────────────────

router.get   ('/courses',                requirePermission(P.COURSES_READ), courseController.list)
router.get   ('/courses/stats',          requirePermission(P.COURSES_READ), courseController.stats)
router.get   ('/courses/mine',           requirePermission(P.COURSES_READ), courseController.mine)
router.get   ('/courses/:id',            requirePermission(P.COURSES_READ), courseController.get)
router.post  ('/courses',                requirePermission(P.COURSES_CREATE), validate(courseSchema), courseController.create)
router.put   ('/courses/:id',            requirePermission(P.COURSES_UPDATE), validate(courseSchema.partial().extend({ active: z.boolean().optional() })), courseController.update)
router.delete('/courses/:id',            requirePermission(P.COURSES_DELETE), courseController.delete)
router.post  ('/courses/bulk-delete',    requirePermission(P.COURSES_DELETE), validate(bulkDeleteSchema), courseController.bulkDelete)

// Course → Assignments
router.get   ('/courses/:id/assignments',                requirePermission(P.COURSES_READ),   courseController.listAssignments)
router.post  ('/courses/:id/assignments',                requirePermission(P.COURSES_UPDATE),  validate(assignLecturerSchema), courseController.assignLecturer)
router.delete('/courses/:id/assignments/:assignmentId',  requirePermission(P.COURSES_UPDATE),  courseController.removeAssignment)

// Course → Outcomes
router.get   ('/courses/:id/outcomes',              requirePermission(P.COURSES_READ),   courseController.listOutcomes)
router.put   ('/courses/:id/outcomes',              requirePermission(P.COURSES_UPDATE),  validate(outcomeSchema), courseController.upsertOutcome)
router.delete('/courses/:id/outcomes/:outcomeId',   requirePermission(P.COURSES_UPDATE),  courseController.deleteOutcome)

// Course → Schedules
router.get   ('/courses/:id/schedules',             requirePermission(P.COURSES_READ),   courseController.listSchedules)
router.post  ('/courses/:id/schedules',             requirePermission(P.COURSES_UPDATE),  validate(scheduleSchema), courseController.addSchedule)
router.put   ('/courses/:id/schedules/:scheduleId', requirePermission(P.COURSES_UPDATE),  validate(scheduleSchema.partial()), courseController.updateSchedule)
router.delete('/courses/:id/schedules/:scheduleId', requirePermission(P.COURSES_UPDATE),  courseController.deleteSchedule)

// Course → Materials
router.get   ('/courses/:id/materials',             requirePermission(P.COURSES_READ),   courseController.listMaterials)
router.post  ('/courses/:id/materials',             requirePermission(P.COURSES_UPDATE),  validate(materialSchema), courseController.addMaterial)
router.delete('/courses/:id/materials/:materialId', requirePermission(P.COURSES_UPDATE),  courseController.deleteMaterial)

export default router
