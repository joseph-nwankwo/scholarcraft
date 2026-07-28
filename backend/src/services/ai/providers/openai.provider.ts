import type { IAIProvider, AIGenerateRequest, AIGenerateResponse, AIModelInfo } from '../types'

export class OpenAIProvider implements IAIProvider {
  readonly provider = 'openai' as const
  private readonly defaultModel = 'gpt-4o'
  private readonly baseUrl = 'https://api.openai.com/v1'

  constructor(private readonly apiKey: string) {}

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`OpenAI error ${res.status}: ${err?.error?.message ?? 'Unknown'}`)
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }>; usage: { prompt_tokens: number; completion_tokens: number }; model: string }
    return {
      content: data.choices[0].message.content,
      tokensInput: data.usage.prompt_tokens,
      tokensOutput: data.usage.completion_tokens,
      model: data.model,
      provider: this.provider,
      durationMs: Date.now() - start,
    }
  }

  async stream(request: AIGenerateRequest, onChunk: (chunk: string) => void): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel
    let fullContent = ''

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    })

    if (!res.ok || !res.body) throw new Error(`OpenAI stream error: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ') || line.includes('[DONE]')) continue
        try {
          const parsed = JSON.parse(line.slice(6)) as { choices?: Array<{ delta?: { content?: string } }>; usage?: { prompt_tokens: number; completion_tokens: number } }
          const text = parsed.choices?.[0]?.delta?.content ?? ''
          if (text) { onChunk(text); fullContent += text }
        } catch { /* skip */ }
      }
    }

    return { content: fullContent, tokensInput: 0, tokensOutput: 0, model, provider: this.provider, durationMs: Date.now() - start }
  }

  getModelInfo(): AIModelInfo {
    return { id: this.defaultModel, name: 'GPT-4o', provider: this.provider, contextWindow: 128000 }
  }
}
