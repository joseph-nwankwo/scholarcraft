import { Router } from 'express'
import { institutionsController } from '../controllers/institutions.controller'
import { authenticate } from '../middleware/auth.middleware'
import { requirePermission, requireInstitution, P } from '../middleware/rbac.middleware'

const router = Router()

router.use(authenticate, requireInstitution)

router.get('/',           requirePermission(P.INSTITUTION_READ),   institutionsController.get)
router.put('/',           requirePermission(P.INSTITUTION_UPDATE),  institutionsController.update)
router.get('/stats',      requirePermission(P.ANALYTICS_READ),      institutionsController.getStats)
router.get('/audit-logs', requirePermission(P.AUDIT_READ),          institutionsController.getAuditLogs)

export default router
