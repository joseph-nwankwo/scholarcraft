import type { ThesisCitation } from '@/lib/api/thesiscraft.api'

export type CitationStyle = 'APA' | 'MLA' | 'Harvard'

/** Formats "Smith, J., & Doe, A." into "Smith, J. and Doe, A." for MLA-style joins. */
function authorsForMla(authors: string) {
  return authors.replace(/,\s*&\s*/g, ', and ')
}

export function formatCitation(c: ThesisCitation, style: CitationStyle): string {
  const year   = c.year ?? 'n.d.'
  const title  = c.title.replace(/\.?$/, '')
  const source = c.source?.trim()
  const url    = c.url?.trim()

  switch (style) {
    case 'APA': {
      let out = `${c.authors} (${year}). ${title}.`
      if (source) out += ` ${source}.`
      if (url) out += ` ${url}`
      return out
    }
    case 'MLA': {
      let out = `${authorsForMla(c.authors)}. "${title}."`
      if (source) out += ` ${source},`
      out += ` ${year}.`
      if (url) out += ` ${url}.`
      return out
    }
    case 'Harvard': {
      let out = `${c.authors}, ${year}. ${title}.`
      if (source) out += ` ${source}.`
      if (url) out += ` Available at: ${url}`
      return out
    }
  }
}

/** Sorts citations alphabetically by author string, the convention for a References/Bibliography list. */
export function sortCitationsAlphabetically(citations: ThesisCitation[]): ThesisCitation[] {
  return [...citations].sort((a, b) => a.authors.localeCompare(b.authors))
}

/**
 * Best-effort surname extraction from a free-text authors field (e.g. "Smith, J., & Doe, A.").
 * There's no structured author list in the data model, so this is a heuristic, not a guarantee.
 */
function authorSurnames(authors: string): string[] {
  const chunks = authors.split(/,?\s*&\s*|,?\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
  const names: string[] = []
  for (const chunk of chunks) {
    const commaCount = (chunk.match(/,/g) || []).length
    if (commaCount >= 3) {
      const tokens = chunk.split(',').map((t) => t.trim()).filter(Boolean)
      for (let i = 0; i < tokens.length; i += 2) names.push(tokens[i])
    } else if (chunk.includes(',')) {
      names.push(chunk.split(',')[0].trim())
    } else {
      const words = chunk.split(/\s+/)
      names.push(words[words.length - 1])
    }
  }
  return names.filter(Boolean)
}

/** Builds a parenthetical in-text citation, e.g. "(Smith & Doe, 2023)" or MLA's "(Smith)". */
export function inTextCitation(c: ThesisCitation, style: CitationStyle): string {
  const names = authorSurnames(c.authors)
  const year  = c.year ?? 'n.d.'

  let authorPart: string
  if (names.length === 0) authorPart = 'Unknown'
  else if (names.length === 1) authorPart = names[0]
  else if (names.length === 2) authorPart = style === 'MLA' ? `${names[0]} and ${names[1]}` : `${names[0]} & ${names[1]}`
  else authorPart = `${names[0]} et al.`

  return style === 'MLA' ? `(${authorPart})` : `(${authorPart}, ${year})`
}
