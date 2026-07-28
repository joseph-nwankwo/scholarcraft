import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { AIProviderFactory } from '../services/ai/factory'

const router = Router()
router.use(authenticate, aiLimiter)

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
  topic:      z.string().trim().max(200).optional(),
  sourceText: z.string().trim().max(20000).optional(),
  count:      z.number().int().min(3).max(30).optional(),
}).refine((d) => d.topic || d.sourceText, { message: 'Provide a topic or source text' })

router.post('/flashcards', validate(flashcardsSchema), asyncHandler(async (req: Request, res: Response) => {
  const { topic, sourceText, count = 10 } = req.body as { topic?: string; sourceText?: string; count?: number }

  const subject = sourceText
    ? `the following notes:\n\n${sourceText}`
    : `the topic "${topic}"`

  const systemPrompt = 'You are a study-aid generator. Respond with ONLY valid JSON, no markdown, no commentary.'
  const prompt = `Generate exactly ${count} flashcards for ${subject}.
Return JSON matching this exact shape: { "cards": [ { "front": string, "back": string } ] }
Each "front" is a short question or term, each "back" is a concise answer or definition. No numbering, no extra text.`

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
  text:   z.string().trim().min(20).max(20000),
  length: z.enum(['short', 'medium', 'long']).optional(),
})

const LENGTH_GUIDE: Record<string, string> = {
  short:  'in 3-4 concise bullet points',
  medium: 'in 2-3 short paragraphs',
  long:   'in a detailed multi-paragraph summary covering all key points',
}

router.post('/summarize', validate(summarizeSchema), asyncHandler(async (req: Request, res: Response) => {
  const { text, length = 'medium' } = req.body as { text: string; length?: keyof typeof LENGTH_GUIDE }

  const systemPrompt = 'You are a study-aid summarizer for a student. Be clear, accurate, and well-organized. Respond in Markdown.'
  const prompt = `Summarize the following notes or article ${LENGTH_GUIDE[length]}. Preserve key facts, definitions, and figures.\n\n${text}`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.4 })

  res.json({ status: 'success', summary: result.content })
}))

// ── Quiz ──────────────────────────────────────────────────────────────────────

const quizSchema = z.object({
  topic:      z.string().trim().max(200).optional(),
  sourceText: z.string().trim().max(20000).optional(),
  count:      z.number().int().min(3).max(20).optional(),
}).refine((d) => d.topic || d.sourceText, { message: 'Provide a topic or source text' })

router.post('/quiz', validate(quizSchema), asyncHandler(async (req: Request, res: Response) => {
  const { topic, sourceText, count = 5 } = req.body as { topic?: string; sourceText?: string; count?: number }

  const subject = sourceText
    ? `the following notes:\n\n${sourceText}`
    : `the topic "${topic}"`

  const systemPrompt = 'You are a study-aid quiz generator. Respond with ONLY valid JSON, no markdown, no commentary.'
  const prompt = `Generate exactly ${count} multiple-choice questions to test understanding of ${subject}.
Return JSON matching this exact shape: { "questions": [ { "question": string, "options": string[4], "correctIndex": number, "explanation": string } ] }
Each question has exactly 4 options, "correctIndex" is the 0-based index of the correct option, and "explanation" briefly explains the correct answer. No numbering, no extra text.`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.6 })
  const parsed = parseJsonResponse<{ questions: { question: string; options: string[]; correctIndex: number; explanation: string }[] }>(result.content)

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw AppError.internal('AI did not return any questions. Please try again.')
  }

  res.json({ status: 'success', questions: parsed.questions })
}))

export default router
