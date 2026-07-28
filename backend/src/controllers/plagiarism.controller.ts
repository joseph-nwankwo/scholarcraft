import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import { AIProviderFactory } from '../services/ai/factory'
import { prisma } from '../config/database'

export interface PlagiarismResult {
  aiScore: number             // 0-100: likelihood text is AI-generated
  originalityScore: number    // 0-100: 100 = fully original, 0 = high risk
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'
  wordCount: number
  summary: string
  aiIndicators: string[]
  originalityIndicators: string[]
  sections: Array<{
    text: string
    flag: 'ai_likely' | 'suspicious' | 'clean'
    reason: string
  }>
  recommendations: string[]
  checkedAt: string
  title?: string
}

function buildPrompt(text: string, checks: string[]): string {
  const doAI   = checks.includes('ai')
  const doPlag = checks.includes('plagiarism')
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length

  return `You are a forensic academic integrity analyst trained to detect AI-generated text with the same precision as tools like Turnitin AI and Originality.AI. Analyse the text below and return ONLY a single valid JSON object — no markdown fences, no preamble, nothing outside the JSON.

${doAI ? `
## TASK 1 — AI-Content Detection

⚠️ CRITICAL RULE: The presence of citations (e.g. "Smith et al., 2020", "Jones (2015)") does NOT indicate human authorship. AI models routinely insert real or fabricated citations. Never use citations as evidence of human writing.

Evaluate ALL signals below. Weigh them together to produce a single holistic score.

### Signal 1 — Burstiness (most important signal)
Count sentence lengths across the text.
- HUMAN: highly variable — some sentences 5 words, some 40+, natural rhythm
- AI: most sentences 15–28 words, very uniform distribution
→ If sentences are uniformly medium-length throughout, this alone pushes score above 60.

### Signal 2 — Formulaic Academic Phrasing (very strong signal)
Flag ANY of these exact patterns:
- "can be defined as" / "is defined as" — AI's default definitional opener
- "It is important to note" / "It is worth noting"
- "Furthermore" / "Moreover" / "Additionally" used as paragraph openers
- "Hence" or "Thus" used to introduce summary sentences
- "According to [Author] ([Year])" appearing in a textbook-summary style
- "…is conditioned with" / "…is associated with" — passive nominal constructions
- Opening sentence that re-states the section/chapter title as a definition

### Signal 3 — Absence of Human Voice
- No first-person perspective ("I argue", "I observed", "in my view")
- No uncertainty expressed in a personal way ("I'm not sure but", "this seems to suggest")
- No informal bridges or asides
- No typos, hesitations, or self-corrections
- Every sentence is grammatically impeccable

### Signal 4 — Semantic Flatness
- Definitions are textbook-generic — could come from any source on the topic
- Multiple authors cited but no synthesis, no critique, no disagreement between them
- Text reads as a summary of summaries, not original thought
- Each sentence adds one fact then stops — no elaboration, no examples from personal experience

### Signal 5 — Structural Regularity
- Topic sentence → explanation → citation → closing sentence, repeated every paragraph
- All paragraphs approximately the same length
- The text could be any chapter from any undergraduate textbook — nothing uniquely locates it

### Calibration (apply strictly):
- 0–20:  Confidently human. High burstiness, personal voice, organic errors.
- 21–40: Likely human with AI assistance (spell-check, light editing).
- 41–60: Ambiguous. Multiple AI signals but also human variation.
- 61–80: Likely AI-generated. Strong uniform signals, few human markers.
- 81–100: Almost certainly AI-generated. Near-perfect match across all five signals.

If Signals 1+2+3 all point to AI, the score MUST be ≥ 75. Do not hedge down.
` : ''}

${doPlag ? `
## TASK 2 — Originality Analysis

⚠️ CRITICAL RULE: A cited source is NOT proof the surrounding text is the student's own words. AI and copy-pasted text often includes correct citations.

### What to detect:
A. Style-Shift: sudden change in vocabulary complexity or sentence structure mid-paragraph
B. Attribution Gaps: statistics, dates, named agreements, or direct quotes with no in-text citation
C. Template Matching: essay structure identical to generic model essays widely available online
D. Definition Stacking: multiple authors' definitions cited one after another with no original synthesis

### Calibration:
- 80–100: Appears original — personal voice, unique examples, proper citations throughout.
- 55–79: Mostly original — one or two concerns.
- 30–54: Significant concern — multiple unattributed passages or clear template use.
- 0–29:  Very high concern — text assembled from sources with minimal student contribution.
` : ''}

## OUTPUT FORMAT — return this JSON exactly:
{
  "aiScore": <integer 0-100 per calibration; ${doAI ? 'DO NOT round to a round number — be precise' : '0 — check not requested'}>,
  "originalityScore": <integer 0-100; ${doPlag ? 'DO NOT round to a round number — be precise' : '100 — check not requested'}>,
  "riskLevel": <"LOW"|"MEDIUM"|"HIGH"|"VERY_HIGH">,
  "wordCount": ${wordCount},
  "summary": "<4 sentences: (1) overall verdict with score justification, (2) the single strongest AI signal found with a direct quote, (3) strongest originality concern or mitigating factor, (4) recommended action for the reviewer>",
  "aiIndicators": [${doAI ? '"<each indicator must quote or paraphrase an exact phrase from the text as evidence>"' : ''}],
  "originalityIndicators": [${doPlag ? '"<each concern must reference a specific sentence or pattern in the text>"' : ''}],
  "sections": [
    {
      "text": "<VERBATIM substring copied character-for-character from the input text, 40–120 chars>",
      "flag": <"ai_likely"|"suspicious"|"clean">,
      "reason": "<one sentence citing the specific signal that caused this flag>"
    }
  ],
  "recommendations": ["<2-5 specific, actionable steps for the lecturer or student>"]
}

## SECTION RULES (critical):
1. "text" MUST be copied verbatim from the input — exact characters, exact spelling, no paraphrase
2. Flag EVERY passage that shows AI signals — do NOT artificially add "clean" flags for balance if the text is predominantly AI
3. Include "clean" flags only if the passage genuinely has human-writing markers; if none exist, do not include any
4. Aim for 5-10 sections covering the full text from start to end
5. riskLevel: LOW ≤ 25 combined concern; MEDIUM 26–54; HIGH 55–74; VERY_HIGH ≥ 75

## TEXT TO ANALYSE (${wordCount} words):
"""
${text}
"""`
}

export const plagiarismController = {
  check: asyncHandler(async (req: Request, res: Response) => {
    const { text, title, checks } = req.body as { text: string; title?: string; checks: string[] }
    const userId = req.user!.userId

    const ai     = AIProviderFactory.getDefault()
    const start  = Date.now()
    const prompt = buildPrompt(text, checks)

    const aiResp = await ai.generate({
      prompt,
      systemPrompt: 'You are a senior academic integrity analyst. You MUST respond with a single valid JSON object and absolutely nothing else — no markdown, no explanation, no code fences.',
      maxTokens: 3000,
      temperature: 0.1,
    })

    // Parse JSON from response
    let result: Omit<PlagiarismResult, 'checkedAt' | 'title'>
    try {
      const raw = aiResp.content.trim()
      const start = raw.indexOf('{')
      const end   = raw.lastIndexOf('}')
      const jsonStr = start !== -1 && end !== -1 ? raw.slice(start, end + 1) : raw
      result = JSON.parse(jsonStr) as typeof result
    } catch {
      // Fallback if AI returns malformed JSON
      result = {
        aiScore: 0, originalityScore: 100, riskLevel: 'LOW',
        wordCount: text.split(/\s+/).length,
        summary: 'Analysis could not be parsed. Please try again.',
        aiIndicators: [], originalityIndicators: [],
        sections: [], recommendations: ['Please re-run the check.'],
      }
    }

    // Persist to AIGeneration for history
    await prisma.aIGeneration.create({
      data: {
        moduleType:   'plagiarism-check',
        provider:     aiResp.provider,
        model:        aiResp.model,
        prompt:       title ?? text.slice(0, 100),
        output:       JSON.stringify({ ...result, title, checks }),
        tokensInput:  aiResp.tokensInput,
        tokensOutput: aiResp.tokensOutput,
        durationMs:   Date.now() - start,
        userId,
      },
    })

    res.json({
      status: 'success',
      data: { ...result, checkedAt: new Date().toISOString(), title } as PlagiarismResult,
    })
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId
    const page   = parseInt(typeof req.query.page  === 'string' ? req.query.page  : '1') || 1
    const limit  = parseInt(typeof req.query.limit === 'string' ? req.query.limit : '20') || 20

    const [total, rows] = await Promise.all([
      prisma.aIGeneration.count({ where: { userId, moduleType: 'plagiarism-check' } }),
      prisma.aIGeneration.findMany({
        where:   { userId, moduleType: 'plagiarism-check' },
        orderBy: { createdAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select:  { id: true, prompt: true, output: true, createdAt: true, durationMs: true },
      }),
    ])

    const data = rows.map((r) => {
      const parsed = JSON.parse(r.output) as Partial<PlagiarismResult & { checks: string[] }>
      return {
        id:              r.id,
        title:           parsed.title ?? r.prompt,
        aiScore:         parsed.aiScore ?? 0,
        originalityScore:parsed.originalityScore ?? 100,
        riskLevel:       parsed.riskLevel ?? 'LOW',
        wordCount:       parsed.wordCount ?? 0,
        checks:          parsed.checks ?? [],
        checkedAt:       r.createdAt.toISOString(),
        durationMs:      r.durationMs,
      }
    })

    res.json({ status: 'success', data, total, page, totalPages: Math.ceil(total / limit) })
  }),
}
