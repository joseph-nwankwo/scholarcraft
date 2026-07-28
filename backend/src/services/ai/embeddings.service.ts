import { env } from '../../config/env'
import { AppError } from '../../utils/errors'

const EMBEDDING_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 96

interface OpenAIEmbeddingResponse {
  data: { embedding: number[]; index: number }[]
}

/** Embeds a batch of texts via OpenAI's embeddings endpoint. Batches internally to stay under request limits. */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!env.OPENAI_API_KEY) throw AppError.internal('OpenAI API key not configured — required for reference document embedding')
  if (texts.length === 0) return []

  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: batch }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw AppError.internal(`Embedding request failed: ${res.status} ${body.slice(0, 200)}`)
    }

    const json = (await res.json()) as OpenAIEmbeddingResponse
    const sorted = [...json.data].sort((a, b) => a.index - b.index)
    results.push(...sorted.map((d) => d.embedding))
  }

  return results
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
