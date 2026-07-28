import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { exportCenterController } from '../controllers/export-center.controller'

const router = Router()
router.use(authenticate)

// Exports
router.get('/',                              exportCenterController.list)
router.get('/documents/:id/download',        exportCenterController.download)
router.post('/documents/:id/queue',          exportCenterController.queue)
router.get('/download/:exportId',            exportCenterController.downloadCompleted)

// Export templates
router.get('/templates',                     exportCenterController.listTemplates)
router.post('/templates',                    exportCenterController.createTemplate)
router.delete('/templates/:id',              exportCenterController.deleteTemplate)

export default router
