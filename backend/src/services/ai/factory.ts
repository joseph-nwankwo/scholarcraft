import { env } from '../../config/env'
import { AppError } from '../../utils/errors'
import type { AIProviderID, IAIProvider } from './types'
import { OpenAIProvider } from './providers/openai.provider'
import { ClaudeProvider } from './providers/claude.provider'
import { GeminiProvider } from './providers/gemini.provider'

export class AIProviderFactory {
  static create(provider: AIProviderID): IAIProvider {
    switch (provider) {
      case 'openai': {
        if (!env.OPENAI_API_KEY) throw AppError.internal('OpenAI API key not configured')
        return new OpenAIProvider(env.OPENAI_API_KEY)
      }
      case 'anthropic': {
        if (!env.ANTHROPIC_API_KEY) throw AppError.internal('Anthropic API key not configured')
        return new ClaudeProvider(env.ANTHROPIC_API_KEY)
      }
      case 'gemini': {
        if (!env.GOOGLE_AI_API_KEY) throw AppError.internal('Google AI API key not configured')
        return new GeminiProvider(env.GOOGLE_AI_API_KEY)
      }
      default:
        throw AppError.badRequest(`Unknown AI provider: ${provider as string}`)
    }
  }

  static getDefault(): IAIProvider {
    if (env.ANTHROPIC_API_KEY) return this.create('anthropic')
    if (env.OPENAI_API_KEY) return this.create('openai')
    if (env.GOOGLE_AI_API_KEY) return this.create('gemini')
    throw AppError.internal('No AI provider API key configured')
  }
}
