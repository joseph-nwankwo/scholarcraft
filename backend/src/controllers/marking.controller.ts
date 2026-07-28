import type { Request, Response } from 'express'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const CLAUDE_API = 'https://api.anthropic.com/v1/messages'

const TRANSCRIPTION_PROMPT = `You are transcribing a student answer script (handwritten or printed).

Instructions:
- Transcribe ALL text you can see, preserving structure (question numbers, headings, paragraphs).
- Keep question labels (e.g. "1a.", "Question 3") exactly as written.
- If handwriting is unclear, write [illegible] in place of that word.
- Do NOT correct spelling or grammar — transcribe exactly what is written.
- Do NOT add commentary, greetings, or explanations — return only the transcribed text.`

export async function transcribeImage(req: Request, res: Response): Promise<void> {
  const file = req.file
  if (!file) {
    res.status(400).json({ status: 'error', message: 'No image file provided' })
    return
  }

  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ status: 'error', message: 'Anthropic API key is not configured' })
    return
  }

  const base64    = file.buffer.toString('base64')
  const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp'

  try {
    const response = await fetch(CLAUDE_API, {
      method:  'POST',
      headers: {
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'image',
                source: { type: 'base64', media_type: mediaType, data: base64 },
              },
              {
                type: 'text',
                text: TRANSCRIPTION_PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } }
      const msg = err.error?.message ?? `Vision API returned ${response.status}`
      logger.error('[marking] Transcription API error', { status: response.status, msg })
      res.status(502).json({ status: 'error', message: msg })
      return
    }

    const data = await response.json() as {
      content: Array<{ type: string; text?: string }>
    }
    const text = data.content.find((c) => c.type === 'text')?.text ?? ''

    res.json({ status: 'success', text, filename: file.originalname })
  } catch (err) {
    logger.error('[marking] Transcription failed', { error: (err as Error).message })
    res.status(500).json({ status: 'error', message: (err as Error).message })
  }
}
