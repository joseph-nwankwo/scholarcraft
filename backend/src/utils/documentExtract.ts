import { AppError } from './errors'

const MAX_EXTRACTED_CHARS = 300_000

export async function extractDocumentText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  let raw: string

  if (mimetype === 'text/plain' || mimetype === 'text/markdown') {
    raw = buffer.toString('utf-8')
  } else if (mimetype === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
    const data = await pdfParse(buffer)
    raw = data.text
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as { extractRawText: (o: { buffer: Buffer }) => Promise<{ value: string }> }
    const result = await mammoth.extractRawText({ buffer })
    raw = result.value
  } else {
    throw AppError.badRequest(`Cannot extract text from ${filename} (${mimetype})`)
  }

  return raw.replace(/\s{3,}/g, '\n\n').trim().slice(0, MAX_EXTRACTED_CHARS)
}

export const ALLOWED_REFERENCE_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown',
]
