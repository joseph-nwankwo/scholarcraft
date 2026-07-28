import { Router } from 'express'
import { z } from 'zod'
import { usersController } from '../controllers/users.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requirePermission, requireInstitution, P } from '../middleware/rbac.middleware'
import { validate } from '../middleware/validate'

const router = Router()

const roleUpdateSchema   = z.object({ roleSlug: z.string().min(1) })
const statusUpdateSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']) })

router.use(authenticate, requireInstitution)

router.get('/',                   requirePermission(P.USERS_READ), usersController.list)
router.get('/roles',              requirePermission(P.USERS_READ), usersController.listRoles)
router.get('/permissions',        requirePermission(P.USERS_READ), usersController.listPermissions)
router.get('/:userId',            requirePermission(P.USERS_READ), usersController.getById)
router.patch('/:userId/role',     requirePermission(P.USERS_MANAGE_ROLES), validate(roleUpdateSchema),   usersController.updateRole)
router.patch('/:userId/status',   requirePermission(P.USERS_UPDATE),       validate(statusUpdateSchema), usersController.updateStatus)
router.delete('/:userId',         requirePermission(P.USERS_DELETE),        usersController.deleteUser)

export default router
