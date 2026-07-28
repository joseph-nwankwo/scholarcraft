import { useState, useEffect, useCallback } from 'react'
import {
  thesiscraftApi, type Thesis, type ThesisStatus, type ChapterStatus, type CitationType,
} from '@/lib/api/thesiscraft.api'

export function useThesis(thesisId: string) {
  const [thesis, setThesis]   = useState<Thesis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const refresh = useCallback(async () => {
    try {
      setThesis(await thesiscraftApi.getThesis(thesisId))
      setError('')
    } catch {
      setError('Could not load this thesis. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [thesisId])

  useEffect(() => { refresh() }, [refresh])

  async function updateMeta(data: Partial<{ title: string; field: string; degreeType: string; supervisorName: string; status: ThesisStatus }>) {
    const updated = await thesiscraftApi.updateThesis(thesisId, data)
    setThesis(updated)
  }

  async function updateProposal(sections: Record<string, string>) {
    const updated = await thesiscraftApi.updateProposal(thesisId, sections)
    setThesis(updated)
  }

  async function saveAssistantDocument(content: string) {
    const updated = await thesiscraftApi.updateThesis(thesisId, { assistantDocument: content })
    setThesis(updated)
  }

  async function addChapter(title: string) {
    const chapter = await thesiscraftApi.createChapter(thesisId, { title })
    setThesis((prev) => prev && { ...prev, chapters: [...prev.chapters, chapter] })
    return chapter
  }

  async function updateChapter(chapterId: string, data: Partial<{ title: string; content: string | null; status: ChapterStatus; order: number }>) {
    const chapter = await thesiscraftApi.updateChapter(chapterId, data)
    setThesis((prev) => prev && { ...prev, chapters: prev.chapters.map((c) => (c.id === chapterId ? chapter : c)) })
    return chapter
  }

  async function removeChapter(chapterId: string) {
    await thesiscraftApi.deleteChapter(chapterId)
    setThesis((prev) => prev && { ...prev, chapters: prev.chapters.filter((c) => c.id !== chapterId) })
  }

  async function addCitation(data: { type?: CitationType; authors: string; year?: number | null; title: string; source?: string; url?: string }) {
    const citation = await thesiscraftApi.createCitation(thesisId, data)
    setThesis((prev) => prev && { ...prev, citations: [...prev.citations, citation] })
    return citation
  }

  async function updateCitation(citationId: string, data: Partial<{ type: CitationType; authors: string; year: number | null; title: string; source: string; url: string }>) {
    const citation = await thesiscraftApi.updateCitation(citationId, data)
    setThesis((prev) => prev && { ...prev, citations: prev.citations.map((c) => (c.id === citationId ? citation : c)) })
    return citation
  }

  async function removeCitation(citationId: string) {
    await thesiscraftApi.deleteCitation(citationId)
    setThesis((prev) => prev && { ...prev, citations: prev.citations.filter((c) => c.id !== citationId) })
  }

  return {
    thesis, loading, error, refresh, updateMeta, updateProposal, saveAssistantDocument,
    addChapter, updateChapter, removeChapter,
    addCitation, updateCitation, removeCitation,
  }
}
