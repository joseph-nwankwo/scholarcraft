/** Splits text into overlapping word-count chunks, suitable for embedding + retrieval. */
export function chunkText(text: string, chunkSize = 350, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const chunks: string[] = []
  let start = 0
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length)
    chunks.push(words.slice(start, end).join(' '))
    if (end === words.length) break
    start = end - overlap
  }
  return chunks
}
