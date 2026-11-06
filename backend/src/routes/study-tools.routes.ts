import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { AIProviderFactory } from '../services/ai/factory'
import { extractDocumentText, ALLOWED_REFERENCE_MIME_TYPES } from '../utils/documentExtract'

const router = Router()
router.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_REFERENCE_MIME_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`Unsupported file type: ${file.mimetype}`))
  },
})

// ── Extract text from an uploaded document (lecture notes, PDF, Word doc, etc.) ──
// Not behind aiLimiter — this is plain parsing, no AI call.
router.post('/extract-text', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file
  if (!file) throw AppError.badRequest('No file uploaded')

  const text = await extractDocumentText(file.buffer, file.mimetype, file.originalname)
  if (!text.trim()) throw AppError.badRequest('No extractable text found in this file')

  res.json({ status: 'success', text })
}))

router.use(aiLimiter)

// ~100k chars (~25k tokens) — comfortably covers a full lecture note or textbook
// chapter while staying well within every supported provider's context window.
const MAX_SOURCE_TEXT_CHARS = 100_000

const ACADEMIC_LEVELS = ['diploma', 'undergraduate', 'postgraduate', 'professional', 'phd'] as const
type AcademicLevel = (typeof ACADEMIC_LEVELS)[number]

const ACADEMIC_LEVEL_GUIDE: Record<AcademicLevel, string> = {
  diploma:       'a diploma-level student — keep vocabulary accessible and focus on foundational concepts',
  undergraduate: 'an undergraduate student — standard university-level depth and terminology',
  postgraduate:  "a postgraduate (Master's) student — assume strong foundational knowledge and go deeper into nuance and application",
  professional:  'a working professional upskilling — practical, applied framing over academic theory',
  phd:           'a PhD/doctoral researcher — rigorous, precise, and comfortable with advanced/technical terminology',
}

const academicLevelSchema = z.enum(ACADEMIC_LEVELS).optional()

/** Strips markdown code fences and grabs the first {...} or [...] block, then parses it. */
function parseJsonResponse<T>(raw: string): T {
  let text = raw.trim()
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) text = fenced[1].trim()

  try {
    return JSON.parse(text) as T
  } catch {
    const start = Math.min(...['{', '['].map((c) => { const i = text.indexOf(c); return i === -1 ? Infinity : i }))
    const endChar = text[start] === '[' ? ']' : '}'
    const end = text.lastIndexOf(endChar)
    if (start === Infinity || end === -1) throw AppError.internal('AI returned an unparsable response. Please try again.')
    try {
      return JSON.parse(text.slice(start, end + 1)) as T
    } catch {
      throw AppError.internal('AI returned an unparsable response. Please try again.')
    }
  }
}

// ── Flashcards ────────────────────────────────────────────────────────────────

const flashcardsSchema = z.object({
  topic:         z.string().trim().max(200).optional(),
  sourceText:    z.string().trim().max(MAX_SOURCE_TEXT_CHARS).optional(),
  count:         z.number().int().min(3).max(30).optional(),
  academicLevel: academicLevelSchema,
}).refine((d) => d.topic || d.sourceText, { message: 'Provide a topic or source text' })

router.post('/flashcards', validate(flashcardsSchema), asyncHandler(async (req: Request, res: Response) => {
  const { topic, sourceText, count = 10, academicLevel = 'undergraduate' } = req.body as { topic?: string; sourceText?: string; count?: number; academicLevel?: AcademicLevel }

  const subject = sourceText
    ? `the following notes:\n\n${sourceText}`
    : `the topic "${topic}"`

  const systemPrompt = `You are a study-aid generator writing for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}. Respond with ONLY valid JSON, no markdown, no commentary.`
  const prompt = `Generate exactly ${count} flashcards for ${subject}.
Return JSON matching this exact shape: { "cards": [ { "front": string, "back": string } ] }
Each "front" is a short question or term, each "back" is a concise answer or definition. No numbering, no extra text.
Pitch the difficulty and terminology for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}.`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.6 })
  const parsed = parseJsonResponse<{ cards: { front: string; back: string }[] }>(result.content)

  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw AppError.internal('AI did not return any flashcards. Please try again.')
  }

  res.json({ status: 'success', cards: parsed.cards })
}))

// ── Summarizer ────────────────────────────────────────────────────────────────

const summarizeSchema = z.object({
  text:          z.string().trim().min(20).max(MAX_SOURCE_TEXT_CHARS),
  length:        z.enum(['short', 'medium', 'long']).optional(),
  academicLevel: academicLevelSchema,
})

const LENGTH_GUIDE: Record<string, string> = {
  short:  'in 3-4 concise bullet points',
  medium: 'in 2-3 short paragraphs',
  long:   'in a detailed multi-paragraph summary covering all key points',
}

router.post('/summarize', validate(summarizeSchema), asyncHandler(async (req: Request, res: Response) => {
  const { text, length = 'medium', academicLevel = 'undergraduate' } = req.body as { text: string; length?: keyof typeof LENGTH_GUIDE; academicLevel?: AcademicLevel }

  const systemPrompt = `You are a study-aid summarizer writing for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}. Be clear, accurate, and well-organized. Respond in Markdown.`
  const prompt = `Summarize the following notes or article ${LENGTH_GUIDE[length]}. Preserve key facts, definitions, and figures. Pitch the language and depth for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}.\n\n${text}`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.4 })

  res.json({ status: 'success', summary: result.content })
}))

// ── Quiz ──────────────────────────────────────────────────────────────────────

const quizSchema = z.object({
  topic:         z.string().trim().max(200).optional(),
  sourceText:    z.string().trim().max(MAX_SOURCE_TEXT_CHARS).optional(),
  count:         z.number().int().min(3).max(20).optional(),
  academicLevel: academicLevelSchema,
}).refine((d) => d.topic || d.sourceText, { message: 'Provide a topic or source text' })

router.post('/quiz', validate(quizSchema), asyncHandler(async (req: Request, res: Response) => {
  const { topic, sourceText, count = 5, academicLevel = 'undergraduate' } = req.body as { topic?: string; sourceText?: string; count?: number; academicLevel?: AcademicLevel }

  const subject = sourceText
    ? `the following notes:\n\n${sourceText}`
    : `the topic "${topic}"`

  const systemPrompt = `You are a study-aid quiz generator writing for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}. Respond with ONLY valid JSON, no markdown, no commentary.`
  const prompt = `Generate exactly ${count} multiple-choice questions to test understanding of ${subject}.
Return JSON matching this exact shape: { "questions": [ { "question": string, "options": string[4], "correctIndex": number, "explanation": string } ] }
Each question has exactly 4 options, "correctIndex" is the 0-based index of the correct option, and "explanation" briefly explains the correct answer. No numbering, no extra text.
Pitch the difficulty and terminology for ${ACADEMIC_LEVEL_GUIDE[academicLevel]}.`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.6 })
  const parsed = parseJsonResponse<{ questions: { question: string; options: string[]; correctIndex: number; explanation: string }[] }>(result.content)

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw AppError.internal('AI did not return any questions. Please try again.')
  }

  res.json({ status: 'success', questions: parsed.questions })
}))

export default router
