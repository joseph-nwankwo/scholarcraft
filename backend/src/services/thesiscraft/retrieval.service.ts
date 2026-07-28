import { prisma } from '../../config/database'
import { getEmbeddings, cosineSimilarity } from '../ai/embeddings.service'

export interface RetrievedChunk {
  content: string
  documentName: string
  score: number
}

/** Retrieves the top-K chunks from a thesis's reference library most relevant to a query. */
export async function retrieveRelevantChunks(thesisId: string, query: string, topK = 5): Promise<RetrievedChunk[]> {
  const chunks = await prisma.thesisReferenceChunk.findMany({
    where: { thesisId },
    select: { content: true, embedding: true, document: { select: { fileName: true } } },
  })
  if (chunks.length === 0) return []

  const [queryEmbedding] = await getEmbeddings([query])

  return chunks
    .map((c) => ({
      content: c.content,
      documentName: c.document.fileName,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
