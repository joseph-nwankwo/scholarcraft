import type { IAIProvider, AIGenerateRequest, AIGenerateResponse, AIModelInfo } from '../types'

export class ClaudeProvider implements IAIProvider {
  readonly provider = 'anthropic' as const
  private readonly defaultModel = 'claude-sonnet-4-6'
  private readonly baseUrl = 'https://api.anthropic.com/v1'
  private readonly apiVersion = '2023-06-01'

  constructor(private readonly apiKey: string) {}

  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
      throw new Error(`Claude error ${res.status}: ${err?.error?.message ?? 'Unknown'}`)
    }

    const data = await res.json() as { content: Array<{ text: string }>; usage: { input_tokens: number; output_tokens: number }; model: string }
    return {
      content: data.content[0].text,
      tokensInput: data.usage.input_tokens,
      tokensOutput: data.usage.output_tokens,
      model: data.model,
      provider: this.provider,
      durationMs: Date.now() - start,
    }
  }

  async stream(request: AIGenerateRequest, onChunk: (chunk: string) => void): Promise<AIGenerateResponse> {
    const start = Date.now()
    const model = request.model ?? this.defaultModel
    let fullContent = ''

    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        ...(request.systemPrompt ? { system: request.systemPrompt } : {}),
        messages: [{ role: 'user', content: request.prompt }],
        stream: true,
      }),
    })

    if (!res.ok || !res.body) throw new Error(`Claude stream error: ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value, { stream: true }).split('\n')) {
        if (!line.startsWith('data: ')) continue
        try {
          const parsed = JSON.parse(line.slice(6)) as { type?: string; delta?: { text?: string } }
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            onChunk(parsed.delta.text)
            fullContent += parsed.delta.text
          }
        } catch { /* skip */ }
      }
    }

    return { content: fullContent, tokensInput: 0, tokensOutput: 0, model, provider: this.provider, durationMs: Date.now() - start }
  }

  getModelInfo(): AIModelInfo {
    return { id: this.defaultModel, name: 'Claude Sonnet 4.6', provider: this.provider, contextWindow: 200000 }
  }
}
