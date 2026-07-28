export type AIProviderID = 'openai' | 'anthropic' | 'gemini'

export interface AIGenerateRequest {
  prompt: string
  systemPrompt?: string
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIGenerateResponse {
  content: string
  tokensInput: number
  tokensOutput: number
  model: string
  provider: AIProviderID
  durationMs: number
}

export interface AIModelInfo {
  id: string
  name: string
  provider: AIProviderID
  contextWindow: number
}

export interface IAIProvider {
  readonly provider: AIProviderID
  generate(request: AIGenerateRequest): Promise<AIGenerateResponse>
  stream(request: AIGenerateRequest, onChunk: (chunk: string) => void): Promise<AIGenerateResponse>
  getModelInfo(): AIModelInfo
}
