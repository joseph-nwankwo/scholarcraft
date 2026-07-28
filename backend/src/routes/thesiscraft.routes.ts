import path from 'path'
import fs from 'fs'
import { Router } from 'express'
import type { Request, Response } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'
import { AIProviderFactory } from '../services/ai/factory'
import { retrieveRelevantChunks } from '../services/thesiscraft/retrieval.service'

const router = Router()
router.use(authenticate)

const CHAPTER_SELECT = { id: true, title: true, order: true, content: true, status: true, createdAt: true, updatedAt: true }
const CITATION_SELECT = { id: true, type: true, authors: true, year: true, title: true, source: true, url: true, createdAt: true, updatedAt: true }
const THESIS_INCLUDE = {
  chapters:  { select: CHAPTER_SELECT, orderBy: { order: 'asc' as const } },
  citations: { select: CITATION_SELECT, orderBy: { createdAt: 'asc' as const } },
}

// ── Theses ────────────────────────────────────────────────────────────────────

const thesisCreateSchema = z.object({
  title:          z.string().trim().min(1).max(300),
  field:          z.string().trim().max(150).optional(),
  degreeType:     z.string().trim().max(100).optional(),
  supervisorName: z.string().trim().max(150).optional(),
})
const thesisUpdateSchema = thesisCreateSchema.partial().extend({
  status:            z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETE']).optional(),
  assistantDocument: z.string().max(500_000).nullable().optional(),
})

router.get('/theses', asyncHandler(async (req: Request, res: Response) => {
  const theses = await prisma.thesis.findMany({
    where: { userId: req.user!.userId },
    include: {
      _count: { select: { chapters: true, citations: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  res.json({ status: 'success', theses })
}))

router.post('/theses', validate(thesisCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.create({
    data: { ...req.body, userId: req.user!.userId },
    include: THESIS_INCLUDE,
  })
  res.status(201).json({ status: 'success', thesis })
}))

router.get('/theses/:id', asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.findFirst({
    where: { id: String(req.params.id), userId: req.user!.userId },
    include: THESIS_INCLUDE,
  })
  if (!thesis) throw AppError.notFound('Thesis')
  res.json({ status: 'success', thesis })
}))

router.patch('/theses/:id', validate(thesisUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesis.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Thesis')
  const thesis = await prisma.thesis.findUnique({ where: { id: String(req.params.id) }, include: THESIS_INCLUDE })
  res.json({ status: 'success', thesis })
}))

router.delete('/theses/:id', asyncHandler(async (req: Request, res: Response) => {
  const thesisId = String(req.params.id)
  const referenceDocs = await prisma.thesisReferenceDocument.findMany({
    where: { thesisId, userId: req.user!.userId },
    select: { fileUrl: true },
  })

  const { count } = await prisma.thesis.deleteMany({
    where: { id: thesisId, userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Thesis')

  for (const doc of referenceDocs) {
    const filePath = path.join(process.cwd(), doc.fileUrl)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }

  res.json({ status: 'success', message: 'Thesis deleted' })
}))

const proposalUpdateSchema = z.object({
  sections: z.record(z.string(), z.string()),
})

router.patch('/theses/:id/proposal', validate(proposalUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesis.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: { proposalSections: req.body.sections },
  })
  if (!count) throw AppError.notFound('Thesis')
  const thesis = await prisma.thesis.findUnique({ where: { id: String(req.params.id) }, include: THESIS_INCLUDE })
  res.json({ status: 'success', thesis })
}))

// ── Chapters ──────────────────────────────────────────────────────────────────

const chapterCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
})
const chapterUpdateSchema = z.object({
  title:   z.string().trim().min(1).max(200).optional(),
  content: z.string().max(100_000).nullable().optional(),
  status:  z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']).optional(),
  order:   z.number().int().optional(),
})

router.post('/theses/:id/chapters', validate(chapterCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.findFirst({ where: { id: String(req.params.id), userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const count = await prisma.thesisChapter.count({ where: { thesisId: thesis.id } })
  const chapter = await prisma.thesisChapter.create({
    data: { ...req.body, order: count, thesisId: thesis.id, userId: req.user!.userId },
    select: CHAPTER_SELECT,
  })
  res.status(201).json({ status: 'success', chapter })
}))

router.patch('/chapters/:id', validate(chapterUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesisChapter.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Chapter')
  const chapter = await prisma.thesisChapter.findUnique({ where: { id: String(req.params.id) }, select: CHAPTER_SELECT })
  res.json({ status: 'success', chapter })
}))

router.delete('/chapters/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesisChapter.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Chapter')
  res.json({ status: 'success', message: 'Chapter deleted' })
}))

// ── Citations ─────────────────────────────────────────────────────────────────

const citationCreateSchema = z.object({
  type:    z.enum(['JOURNAL', 'BOOK', 'WEBSITE', 'CONFERENCE', 'THESIS', 'OTHER']).optional(),
  authors: z.string().trim().min(1).max(300),
  year:    z.number().int().min(1000).max(3000).nullable().optional(),
  title:   z.string().trim().min(1).max(400),
  source:  z.string().trim().max(300).optional(),
  url:     z.string().trim().max(500).optional(),
})
const citationUpdateSchema = citationCreateSchema.partial()

router.post('/theses/:id/citations', validate(citationCreateSchema), asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.findFirst({ where: { id: String(req.params.id), userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const citation = await prisma.thesisCitation.create({
    data: { ...req.body, thesisId: thesis.id, userId: req.user!.userId },
    select: CITATION_SELECT,
  })
  res.status(201).json({ status: 'success', citation })
}))

router.patch('/citations/:id', validate(citationUpdateSchema), asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesisCitation.updateMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
    data: req.body,
  })
  if (!count) throw AppError.notFound('Citation')
  const citation = await prisma.thesisCitation.findUnique({ where: { id: String(req.params.id) }, select: CITATION_SELECT })
  res.json({ status: 'success', citation })
}))

router.delete('/citations/:id', asyncHandler(async (req: Request, res: Response) => {
  const { count } = await prisma.thesisCitation.deleteMany({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!count) throw AppError.notFound('Citation')
  res.json({ status: 'success', message: 'Citation deleted' })
}))

// ── AI assistance ─────────────────────────────────────────────────────────────

/** Retrieves relevant excerpts from the thesis's uploaded reference library and formats them for prompt injection. */
async function buildReferenceContext(thesisId: string, query: string): Promise<string> {
  const chunks = await retrieveRelevantChunks(thesisId, query, 6)
  if (chunks.length === 0) return ''

  const excerpts = chunks
    .map((c, i) => `[${i + 1}] Source: ${c.documentName}\n"${c.content.slice(0, 800)}"`)
    .join('\n\n')

  return `\n\nThe student has uploaded reference material. Below are the excerpts most relevant to this section. Draw on them where genuinely relevant, and cite the source document by name (e.g. "(${chunks[0].documentName})") when you use a fact, claim, or idea from it. Do not fabricate citations, and do not force references that don't fit — only use what's actually relevant.\n\n${excerpts}`
}

const proposalSectionSchema = z.object({
  thesisId:     z.string(),
  sectionLabel: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(2000).optional(),
})

router.post('/ai/proposal-section', aiLimiter, validate(proposalSectionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { thesisId, sectionLabel, instructions } = req.body as { thesisId: string; sectionLabel: string; instructions?: string }
  const thesis = await prisma.thesis.findFirst({ where: { id: thesisId, userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const referenceContext = await buildReferenceContext(thesisId, `${thesis.title} — ${sectionLabel}`)

  const systemPrompt = 'You are an academic writing assistant helping a student draft their thesis/dissertation proposal. Write in formal academic English. Respond with only the section content in Markdown — no headings repeating the section name, no commentary.'
  const prompt = `Thesis title: "${thesis.title}"
Field of study: ${thesis.field ?? 'Not specified'}
Degree: ${thesis.degreeType ?? 'Not specified'}

Draft the "${sectionLabel}" section of the research proposal for this thesis.${instructions ? `\nAdditional guidance: ${instructions}` : ''}
Keep it focused, well-organized, and 2-4 paragraphs unless the section warrants a short list.${referenceContext}`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.5, maxTokens: 1200 })
  res.json({ status: 'success', content: result.content })
}))

const chapterDraftSchema = z.object({
  thesisId:     z.string(),
  chapterTitle: z.string().trim().min(1).max(200),
  instructions: z.string().trim().max(2000).optional(),
})

router.post('/ai/chapter-draft', aiLimiter, validate(chapterDraftSchema), asyncHandler(async (req: Request, res: Response) => {
  const { thesisId, chapterTitle, instructions } = req.body as { thesisId: string; chapterTitle: string; instructions?: string }
  const thesis = await prisma.thesis.findFirst({ where: { id: thesisId, userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const referenceContext = await buildReferenceContext(thesisId, `${thesis.title} — ${chapterTitle}`)

  const systemPrompt = 'You are an academic writing assistant helping a student draft a chapter of their thesis/dissertation. Write in formal academic English with clear structure (use Markdown headings/subheadings where appropriate). Respond with only the chapter draft — no commentary.'
  const prompt = `Thesis title: "${thesis.title}"
Field of study: ${thesis.field ?? 'Not specified'}
Degree: ${thesis.degreeType ?? 'Not specified'}

Draft the chapter "${chapterTitle}" for this thesis.${instructions ? `\nAdditional guidance: ${instructions}` : ''}
Produce a substantive first-draft structure the student can expand on, with section headings appropriate to this chapter.${referenceContext}`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.6, maxTokens: 3000 })
  res.json({ status: 'success', content: result.content })
}))

// ── Thesis Assistant — originality coaching ────────────────────────────────────
// Note: the actual AI-detection / plagiarism scoring is handled by the shared
// POST /api/plagiarism/check endpoint. This endpoint only gives the student
// coaching on HOW to rewrite a flagged passage in their own words — it never
// generates a replacement passage for them to paste in.

const coachingSchema = z.object({
  passage:   z.string().trim().min(10).max(2000),
  reason:    z.string().trim().max(500).optional(),
  flagType:  z.enum(['ai_likely', 'suspicious']).optional(),
})

router.post('/ai/originality-coaching', aiLimiter, validate(coachingSchema), asyncHandler(async (req: Request, res: Response) => {
  const { passage, reason, flagType } = req.body as { passage: string; reason?: string; flagType?: 'ai_likely' | 'suspicious' }

  const systemPrompt = 'You are a supportive academic writing coach. A passage from a student\'s thesis was flagged by an AI-detection/originality review. You NEVER rewrite the passage for the student — you give specific, actionable guidance so the student can rewrite it themselves, in their own voice, with proper attribution. Respond in plain text, 2-4 short bullet points, no preamble.'
  const prompt = `Flag type: ${flagType === 'ai_likely' ? 'Reads as AI-generated' : 'Possible originality/attribution concern'}
${reason ? `Reviewer's reason: ${reason}` : ''}

Flagged passage:
"${passage}"

Give the student specific, actionable guidance for rewriting this passage themselves. Reference concrete details from the passage (don't be generic). Cover, where relevant: (1) where to add their own critical perspective, interpretation, or example, (2) any claims/statistics/ideas here that need a citation, (3) how to vary the sentence structure so it reads less uniformly. Do not include a rewritten version of the passage.`

  const provider = AIProviderFactory.getDefault()
  const result = await provider.generate({ prompt, systemPrompt, temperature: 0.5, maxTokens: 500 })
  res.json({ status: 'success', guidance: result.content })
}))

export default router
