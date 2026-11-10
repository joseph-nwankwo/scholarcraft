import { Router } from 'express'
import type { Request, Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { aiLimiter } from '../middleware/rateLimiter'
import { asyncHandler } from '../utils/asyncHandler'
import { AppError } from '../utils/errors'
import { prisma } from '../config/database'
import { extractDocumentText, ALLOWED_REFERENCE_MIME_TYPES } from '../utils/documentExtract'
import { chunkText } from '../utils/chunkText'
import { env } from '../config/env'
import { getEmbeddings } from '../services/ai/embeddings.service'
import { retrieveRelevantChunks } from '../services/thesiscraft/retrieval.service'
import { s3Service } from '../services/storage/s3.service'

const router = Router()
router.use(authenticate)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_REFERENCE_MIME_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(new Error(`Unsupported file type: ${file.mimetype}`))
  },
})

const DOCUMENT_SELECT = {
  id: true, fileName: true, fileUrl: true, fileType: true,
  status: true, errorMessage: true, chunkCount: true, createdAt: true,
}

// ── Upload & process reference documents ────────────────────────────────────────

router.post('/theses/:id/references', upload.array('files', 5), asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.findFirst({ where: { id: String(req.params.id), userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const files = req.files as Express.Multer.File[] | undefined
  if (!files || files.length === 0) throw AppError.badRequest('No files uploaded')

  const results = []

  for (const file of files) {
    // Upload to R2 first so we have the key before creating the DB record.
    // fileUrl stores the R2 object key (not the public URL) so the delete
    // handler can call s3Service.delete() without a separate key column.
    let r2Key: string
    try {
      const { key } = await s3Service.upload(file, 'thesis-references')
      r2Key = key
    } catch (uploadErr: unknown) {
      results.push({ error: `Upload failed for ${file.originalname}: ${(uploadErr as Error).message}` })
      continue
    }

    const document = await prisma.thesisReferenceDocument.create({
      data: {
        thesisId: thesis.id,
        userId:   req.user!.userId,
        fileName: file.originalname,
        fileUrl:  r2Key,
        fileType: file.mimetype,
        status:   'PROCESSING',
      },
      select: DOCUMENT_SELECT,
    })

    try {
      const text = await extractDocumentText(file.buffer, file.mimetype, file.originalname)
      if (!text.trim()) throw new Error('No extractable text found in this file')

      const chunks = chunkText(text)
      const embeddings = await getEmbeddings(chunks)

      await prisma.thesisReferenceChunk.createMany({
        data: chunks.map((content, i) => ({
          documentId: document.id,
          thesisId:   thesis.id,
          chunkIndex: i,
          content,
          embedding:  embeddings[i],
        })),
      })

      const updated = await prisma.thesisReferenceDocument.update({
        where: { id: document.id },
        data:  { status: 'READY', chunkCount: chunks.length },
        select: DOCUMENT_SELECT,
      })
      results.push(updated)
    } catch (err: unknown) {
      const updated = await prisma.thesisReferenceDocument.update({
        where: { id: document.id },
        data:  { status: 'FAILED', errorMessage: (err as Error).message.slice(0, 300) },
        select: DOCUMENT_SELECT,
      })
      results.push(updated)
    }
  }

  res.status(201).json({ status: 'success', documents: results })
}))

router.get('/theses/:id/references', asyncHandler(async (req: Request, res: Response) => {
  const documents = await prisma.thesisReferenceDocument.findMany({
    where: { thesisId: String(req.params.id), userId: req.user!.userId },
    select: DOCUMENT_SELECT,
    orderBy: { createdAt: 'desc' },
  })
  res.json({ status: 'success', documents })
}))

router.delete('/references/:id', asyncHandler(async (req: Request, res: Response) => {
  const document = await prisma.thesisReferenceDocument.findFirst({
    where: { id: String(req.params.id), userId: req.user!.userId },
  })
  if (!document) throw AppError.notFound('Reference document')

  await prisma.thesisReferenceDocument.delete({ where: { id: document.id } })

  // Best-effort R2 deletion — don't block the response if it fails.
  s3Service.delete(document.fileUrl).catch((err: unknown) => {
    console.error('R2 delete failed for key', document.fileUrl, (err as Error).message)
  })

  res.json({ status: 'success', message: 'Reference document deleted' })
}))

// ── Semantic search over a thesis's own uploaded references ────────────────────

const referenceSearchSchema = z.object({ query: z.string().trim().min(2).max(300) })

router.post('/theses/:id/references/search', aiLimiter, validate(referenceSearchSchema), asyncHandler(async (req: Request, res: Response) => {
  const thesis = await prisma.thesis.findFirst({ where: { id: String(req.params.id), userId: req.user!.userId } })
  if (!thesis) throw AppError.notFound('Thesis')

  const results = await retrieveRelevantChunks(thesis.id, (req.body as { query: string }).query, 8)
  res.json({ status: 'success', results })
}))

// ── Literature search — CrossRef + Semantic Scholar ─────────────────────────────

interface LiteratureResult {
  provider: 'crossref' | 'semanticscholar'
  title: string
  authors: string
  year: number | null
  venue: string | null
  publisher: string | null
  url: string | null
  doi: string | null
  origin: 'local' | 'foreign' | 'unknown'
}

const COUNTRY_TLDS: Record<string, string> = {
  Nigeria: '.ng', Ghana: '.gh', Kenya: '.ke', 'South Africa': '.za',
  'United Kingdom': '.uk', 'United States': '.us', India: '.in',
}

/**
 * Heuristic only — classifies a result as local/foreign by checking whether the
 * student's country (or its ccTLD) appears in the venue, publisher, title, or URL.
 * Neither CrossRef nor Semantic Scholar expose a real "country of publication"
 * field, so this is a best-effort keyword match, not an authoritative signal.
 */
function classifyOrigin(fields: { title: string; venue: string | null; publisher: string | null; url: string | null }, country: string): 'local' | 'foreign' | 'unknown' {
  const haystack = [fields.title, fields.venue, fields.publisher, fields.url].filter(Boolean).join(' ').toLowerCase()
  const countryLower = country.toLowerCase()
  const tld = COUNTRY_TLDS[country]

  if (haystack.includes(countryLower)) return 'local'
  if (tld && fields.url?.toLowerCase().includes(tld)) return 'local'
  return haystack.length > 0 ? 'foreign' : 'unknown'
}

interface CrossRefWork {
  title?: string[]
  author?: { given?: string; family?: string }[]
  issued?: { 'date-parts'?: number[][] }
  'container-title'?: string[]
  publisher?: string
  DOI?: string
  URL?: string
}

async function searchCrossRef(query: string): Promise<Omit<LiteratureResult, 'origin'>[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=10`
  const res = await fetch(url, { headers: { 'User-Agent': 'ScholarCraft/1.0 (mailto:support@scholarcraft.app)' } })
  if (!res.ok) return []
  const json = (await res.json()) as { message?: { items?: CrossRefWork[] } }
  const items = json.message?.items ?? []

  return items.map((item) => ({
    provider:  'crossref' as const,
    title:     item.title?.[0] ?? 'Untitled',
    authors:   (item.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(' ')).join(', ') || 'Unknown',
    year:      item.issued?.['date-parts']?.[0]?.[0] ?? null,
    venue:     item['container-title']?.[0] ?? null,
    publisher: item.publisher ?? null,
    url:       item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : null),
    doi:       item.DOI ?? null,
  }))
}

interface SemanticScholarPaper {
  title?: string
  authors?: { name?: string }[]
  year?: number
  venue?: string
  url?: string
  externalIds?: { DOI?: string }
}

async function searchSemanticScholar(query: string): Promise<Omit<LiteratureResult, 'origin'>[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=title,authors,year,venue,externalIds,url`
  const res = await fetch(url, {
    headers: env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': env.SEMANTIC_SCHOLAR_API_KEY } : {},
  })
  if (!res.ok) return []
  const json = (await res.json()) as { data?: SemanticScholarPaper[] }
  const items = json.data ?? []

  return items.map((item) => ({
    provider:  'semanticscholar' as const,
    title:     item.title ?? 'Untitled',
    authors:   (item.authors ?? []).map((a) => a.name).filter(Boolean).join(', ') || 'Unknown',
    year:      item.year ?? null,
    venue:     item.venue || null,
    publisher: null,
    url:       item.url ?? (item.externalIds?.DOI ? `https://doi.org/${item.externalIds.DOI}` : null),
    doi:       item.externalIds?.DOI ?? null,
  }))
}

router.get('/literature-search', asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.query ?? '').trim()
  if (query.length < 2) throw AppError.badRequest('Query must be at least 2 characters')
  const preferLocal = String(req.query.preferLocal ?? '') === 'true'

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { personalInstitutionType: true, institution: { select: { country: true } } },
  })
  const country = user?.institution?.country ?? 'Nigeria'

  // Query augmentation is the one thing that genuinely biases results toward a
  // country — both providers' own relevance ranking will favor works mentioning
  // the appended term. This actually changes what comes back, unlike a fake filter.
  const searchQuery = preferLocal ? `${query} ${country}` : query

  const [crossref, semanticScholar] = await Promise.allSettled([
    searchCrossRef(searchQuery),
    searchSemanticScholar(searchQuery),
  ])

  const results: LiteratureResult[] = [
    ...(crossref.status === 'fulfilled' ? crossref.value : []),
    ...(semanticScholar.status === 'fulfilled' ? semanticScholar.value : []),
  ].map((r) => ({ ...r, origin: classifyOrigin(r, country) }))

  res.json({
    status: 'success',
    results,
    country,
    note: 'The "Local"/"Foreign" label is a keyword-match heuristic (checks for the country name or its domain in the title, venue, publisher, or URL) — CrossRef and Semantic Scholar don\'t expose a real country-of-publication field, so this is a best-effort signal, not a guarantee.',
  })
}))

export default router
