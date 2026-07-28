import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { authenticate } from '../middleware/auth.middleware'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'

const router = Router()
router.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`Unsupported file type: ${file.mimetype}`))
  },
})

async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
    return buffer.toString('utf-8')
  }

  if (mimetype === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = (require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>)
    const data = await pdfParse(buffer)
    return data.text
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> }
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw AppError.badRequest(`Cannot extract text from ${filename}`)
}

router.post(
  '/extract',
  upload.array('files', 5),
  asyncHandler(async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined
    if (!files || files.length === 0) throw AppError.badRequest('No files uploaded')

    const results: Array<{ filename: string; text: string; chars: number }> = []
    const errors:  Array<{ filename: string; error: string }> = []

    for (const file of files) {
      try {
        const raw  = await extractText(file.buffer, file.mimetype, file.originalname)
        // Trim excess whitespace and cap at 40 000 chars per file to stay within token limits
        const text = raw.replace(/\s{3,}/g, '\n\n').trim().slice(0, 40_000)
        results.push({ filename: file.originalname, text, chars: text.length })
      } catch (err: unknown) {
        errors.push({ filename: file.originalname, error: (err as Error).message })
      }
    }

    // Combine all extracted texts
    const combined = results
      .map((r) => `--- SOURCE: ${r.filename} ---\n${r.text}`)
      .join('\n\n')

    res.json({
      status:  'success',
      sources: results.map((r) => ({ filename: r.filename, chars: r.chars })),
      errors,
      combined,
      totalChars: combined.length,
    })
  })
)

export default router
