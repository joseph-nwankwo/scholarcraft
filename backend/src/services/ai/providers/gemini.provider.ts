import type { IAIProvider, AIGenerateRequest, AIGenerateResponse, AIModelInfo } from '../types'

export class GeminiProvider implements IAIProvider {
  readonly provider = 'gemini' as const
  private readonly defaultModel = 'gemini-2.0-flash'
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private readonly apiKey: string) {}

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: request.prompt }] }],
        ...(request.systemPrompt ? { systemInstruction: { parts: [{ text: request.systemPrompt }] } } : {}),
        generationConfig: { maxOutputTokens: request.maxTokens ?? 4096, temperature: request.temperature ?? 0.7 },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`Gemini error ${res.status}: ${err?.error?.message ?? 'Unknown'}`)
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return {
      content,
      tokensInput: data.usageMetadata?.promptTokenCount ?? 0,
      tokensOutput: data.usageMetadata?.candidatesTokenCount ?? 0,
      model,
      provider: this.provider,
      durationMs: Date.now() - start,
    }
  }

  async stream(request: AIGenerateRequest, onChunk: (chunk: string) => void): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel
    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`
    let fullContent = ''

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: request.prompt }] }] }),
    })

    if (!res.ok || !res.body) throw new Error(`Gemini stream error: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6)) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          if (text) { onChunk(text); fullContent += text }
        } catch { /* skip */ }
      }
    }

    return { content: fullContent, tokensInput: 0, tokensOutput: 0, model, provider: this.provider, durationMs: Date.now() - start }
  }

  getModelInfo(): AIModelInfo {
    return { id: this.defaultModel, name: 'Gemini 2.0 Flash', provider: this.provider, contextWindow: 1000000 }
  }
}
