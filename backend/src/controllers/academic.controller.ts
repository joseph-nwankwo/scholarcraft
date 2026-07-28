import type { Request } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { facultyService } from '../services/academic/faculty.service'
import { departmentService } from '../services/academic/department.service'
import { programmeService } from '../services/academic/programme.service'
import { academicSessionService } from '../services/academic/academic-session.service'
import { courseService } from '../services/academic/course.service'

function inst(req: Request): string { return req.user!.institutionId! }
function actor(req: Request): string { return req.user!.userId }
function id(req: Request, key = 'id'): string { return String(req.params[key]) }

// ── Faculty ───────────────────────────────────────────────────────────────────

export const facultyController = {
  list:   asyncHandler(async (req, res) => res.json({ status: 'success', ...(await facultyService.list(inst(req), req.query as never)) })),
  get:    asyncHandler(async (req, res) => res.json({ status: 'success', data: await facultyService.getById(inst(req), id(req)) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await facultyService.create(inst(req), actor(req), req.body) })),
  update: asyncHandler(async (req, res) => res.json({ status: 'success', data: await facultyService.update(inst(req), id(req), actor(req), req.body) })),
  delete: asyncHandler(async (req, res) => { await facultyService.delete(inst(req), id(req), actor(req)); res.json({ status: 'success', message: 'Faculty deleted' }) }),
  stats:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await facultyService.getStats(inst(req), id(req)) })),
}

// ── Department ────────────────────────────────────────────────────────────────

export const departmentController = {
  list:   asyncHandler(async (req, res) => res.json({ status: 'success', ...(await departmentService.list(inst(req), req.query as never)) })),
  get:    asyncHandler(async (req, res) => res.json({ status: 'success', data: await departmentService.getById(inst(req), id(req)) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await departmentService.create(inst(req), actor(req), req.body) })),
  update: asyncHandler(async (req, res) => res.json({ status: 'success', data: await departmentService.update(inst(req), id(req), actor(req), req.body) })),
  delete: asyncHandler(async (req, res) => { await departmentService.delete(inst(req), id(req), actor(req)); res.json({ status: 'success', message: 'Department deleted' }) }),
}

// ── Programme ─────────────────────────────────────────────────────────────────

export const programmeController = {
  list:   asyncHandler(async (req, res) => res.json({ status: 'success', ...(await programmeService.list(inst(req), req.query as never)) })),
  get:    asyncHandler(async (req, res) => res.json({ status: 'success', data: await programmeService.getById(inst(req), id(req)) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await programmeService.create(inst(req), actor(req), req.body) })),
  update: asyncHandler(async (req, res) => res.json({ status: 'success', data: await programmeService.update(inst(req), id(req), actor(req), req.body) })),
  delete: asyncHandler(async (req, res) => { await programmeService.delete(inst(req), id(req), actor(req)); res.json({ status: 'success', message: 'Programme deleted' }) }),
}

// ── Academic Sessions ─────────────────────────────────────────────────────────

export const academicSessionController = {
  listSessions:   asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.listSessions(inst(req)) })),
  getSession:     asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.getSession(inst(req), id(req)) })),
  createSession:  asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await academicSessionService.createSession(inst(req), actor(req), req.body) })),
  updateSession:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.updateSession(inst(req), id(req), actor(req), req.body) })),
  deleteSession:  asyncHandler(async (req, res) => { await academicSessionService.deleteSession(inst(req), id(req), actor(req)); res.json({ status: 'success', message: 'Session deleted' }) }),

  listSemesters:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.listSemesters(inst(req), req.query.sessionId as string | undefined) })),
  getSemester:    asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.getSemester(inst(req), id(req, 'semesterId')) })),
  currentSemester: asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.getCurrentSemester(inst(req)) })),
  createSemester: asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await academicSessionService.createSemester(inst(req), actor(req), req.body) })),
  updateSemester: asyncHandler(async (req, res) => res.json({ status: 'success', data: await academicSessionService.updateSemester(inst(req), id(req, 'semesterId'), actor(req), req.body) })),
  deleteSemester: asyncHandler(async (req, res) => { await academicSessionService.deleteSemester(inst(req), id(req, 'semesterId'), actor(req)); res.json({ status: 'success', message: 'Semester deleted' }) }),
}

// ── Courses ───────────────────────────────────────────────────────────────────

export const courseController = {
  list:   asyncHandler(async (req, res) => res.json({ status: 'success', ...(await courseService.list(inst(req), req.query as never)) })),
  get:    asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.getById(inst(req), id(req)) })),
  create: asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await courseService.create(inst(req), actor(req), req.body) })),
  update: asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.update(inst(req), id(req), actor(req), req.body) })),
  delete: asyncHandler(async (req, res) => { await courseService.delete(inst(req), id(req), actor(req)); res.json({ status: 'success', message: 'Course deleted' }) }),
  bulkDelete: asyncHandler(async (req, res) => { await courseService.bulkDelete(inst(req), (req.body as { ids: string[] }).ids, actor(req)); res.json({ status: 'success', message: 'Courses deleted' }) }),
  stats:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.getDashboardStats(inst(req)) })),
  mine:   asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.getMyCourses(inst(req), actor(req)) })),

  // Assignments
  listAssignments:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.listAssignments(inst(req), id(req)) })),
  assignLecturer:   asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await courseService.assignLecturer(inst(req), id(req), actor(req), req.body) })),
  removeAssignment: asyncHandler(async (req, res) => { await courseService.removeAssignment(inst(req), id(req), String(req.params.assignmentId), actor(req)); res.json({ status: 'success', message: 'Assignment removed' }) }),

  // Outcomes
  listOutcomes:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.listOutcomes(inst(req), id(req)) })),
  upsertOutcome: asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.upsertOutcome(inst(req), id(req), actor(req), req.body) })),
  deleteOutcome: asyncHandler(async (req, res) => { await courseService.deleteOutcome(inst(req), id(req), String(req.params.outcomeId), actor(req)); res.json({ status: 'success', message: 'Outcome deleted' }) }),

  // Schedules
  listSchedules:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.listSchedules(inst(req), id(req)) })),
  addSchedule:    asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await courseService.addSchedule(inst(req), id(req), actor(req), req.body) })),
  updateSchedule: asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.updateSchedule(inst(req), id(req), String(req.params.scheduleId), actor(req), req.body) })),
  deleteSchedule: asyncHandler(async (req, res) => { await courseService.deleteSchedule(inst(req), id(req), String(req.params.scheduleId), actor(req)); res.json({ status: 'success', message: 'Schedule deleted' }) }),

  // Materials
  listMaterials:  asyncHandler(async (req, res) => res.json({ status: 'success', data: await courseService.listMaterials(inst(req), id(req)) })),
  addMaterial:    asyncHandler(async (req, res) => res.status(201).json({ status: 'success', data: await courseService.addMaterial(inst(req), id(req), actor(req), req.body) })),
  deleteMaterial: asyncHandler(async (req, res) => { await courseService.deleteMaterial(inst(req), id(req), String(req.params.materialId), actor(req)); res.json({ status: 'success', message: 'Material deleted' }) }),
}
