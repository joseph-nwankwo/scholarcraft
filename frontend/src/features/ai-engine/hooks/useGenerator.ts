import { useState, useCallback, useRef } from 'react'
import { streamGeneration, type GenerationParams, type GeneratorType } from '@/lib/api/generation.api'

export interface GeneratorState {
  content: string
  isGenerating: boolean
  isDone: boolean
  error: string | null
  documentId: string | null
  tokensUsed: number
}

const INITIAL: GeneratorState = {
  content: '', isGenerating: false, isDone: false,
  error: null, documentId: null, tokensUsed: 0,
}

export function useGenerator(type: GeneratorType) {
  const [state, setState] = useState<GeneratorState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (params: GenerationParams) => {
    if (state.isGenerating) return

    abortRef.current = new AbortController()
    setState({ content: '', isGenerating: true, isDone: false, error: null, documentId: null, tokensUsed: 0 })

    await streamGeneration(type, params, {
      signal: abortRef.current.signal,
      onChunk: (chunk) => setState((prev) => ({ ...prev, content: prev.content + chunk })),
      onDone: (documentId, tokensUsed) => setState((prev) => ({ ...prev, isGenerating: false, isDone: true, documentId, tokensUsed })),
      onError: (error) => setState((prev) => ({ ...prev, isGenerating: false, error })),
    })
  }, [type, state.isGenerating])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState((prev) => ({ ...prev, isGenerating: false }))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(INITIAL)
  }, [])

  return { ...state, generate, cancel, reset }
}
