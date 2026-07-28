import { Router } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth.middleware'
import { transcribeImage } from '../controllers/marking.controller'

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, or WEBP images are supported'))
    }
  },
})

const router = Router()

// POST /api/marking/transcribe — read a student answer script image via Claude vision
router.post('/transcribe', authenticate, imageUpload.single('image'), transcribeImage)

export default router
