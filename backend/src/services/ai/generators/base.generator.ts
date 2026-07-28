import { AIProviderFactory } from '../factory'
import { prisma } from '../../../config/database'
import { auditService } from '../../audit/audit.service'
import type { AIProviderID } from '../types'
import type { DocumentType } from '@prisma/client'

export type AcademicLevel = 'ND' | 'HND' | 'BSC' | 'MSC' | 'MBA' | 'PHD' | 'PROFESSIONAL'
export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
export type BloomLevelParam = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYSE' | 'EVALUATE' | 'CREATE'

export interface GenerationParams {
  topic: string
  subject?: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  academicLevel: AcademicLevel
  bloomLevel?: BloomLevelParam
  difficulty?: DifficultyLevel
  wordCount?: number
  duration?: number
  teachingStyle?: string
  language?: string
  tone?: string
  referenceStyle?: string
  outputFormat?: string
  includeExamples?: boolean
  includeCaseStudies?: boolean
  includeExercises?: boolean
  includeReferences?: boolean
  customInstructions?: string
  sourceContext?: string
  numberOfQuestions?: number
  numberOfWeeks?: number
  provider?: AIProviderID
  model?: string
  maxTokens?: number
  temperature?: number
  institutionId?: string
}

export interface GenerationResult {
  content: string
  tokensInput: number
  tokensOutput: number
  durationMs: number
  documentId: string
  model: string
  provider: AIProviderID
}

export abstract class BaseGenerator {
  abstract readonly documentType: DocumentType
  abstract readonly moduleType: string

  abstract buildSystemPrompt(): string
  abstract buildPrompt(params: GenerationParams): string
  abstract buildTitle(params: GenerationParams): string

  async generate(
    params: GenerationParams,
    userId: string,
    onChunk?: (chunk: string) => void
  ): Promise<GenerationResult> {
    const start = Date.now()
    const aiProvider = params.provider
      ? AIProviderFactory.create(params.provider)
      : AIProviderFactory.getDefault()

    const prompt = this.buildPrompt(params)
    const systemPrompt = this.buildSystemPrompt()
    const title = this.buildTitle(params)

    const result = await aiProvider.stream(
      {
        prompt,
        systemPrompt,
        model: params.model,
        maxTokens: params.maxTokens ?? 8192,
        temperature: params.temperature ?? 0.7,
      },
      onChunk ?? (() => {})
    )

    const wordCount = result.content.split(/\s+/).filter(Boolean).length

    const document = await prisma.document.create({
      data: {
        title,
        type: this.documentType,
        status: 'GENERATED',
        content: result.content,
        userId,
        institutionId: params.institutionId,
        courseId: params.courseId,
        tags: [this.moduleType, params.academicLevel, params.topic].filter(Boolean),
      },
    })

    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        markdownContent: result.content,
        wordCount,
        tokenUsage: result.tokensInput + result.tokensOutput,
        generationTime: Date.now() - start,
        prompt,
        createdBy: userId,
      },
    })

    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    })

    await prisma.aIGeneration.create({
      data: {
        moduleType: this.moduleType,
        provider: aiProvider.provider,
        model: result.model,
        prompt,
        output: result.content,
        tokensInput: result.tokensInput,
        tokensOutput: result.tokensOutput,
        durationMs: result.durationMs,
        userId,
        documentId: document.id,
      },
    })

    if (result.tokensInput + result.tokensOutput > 0) {
      const costPerToken = aiProvider.provider === 'anthropic' ? 0.000015 : 0.00001
      await prisma.aIUsage.create({
        data: {
          userId,
          provider: aiProvider.provider,
          moduleType: this.moduleType,
          tokensInput: result.tokensInput,
          tokensOutput: result.tokensOutput,
          costUsd: (result.tokensInput + result.tokensOutput) * costPerToken,
        },
      })
    }

    void auditService.log({
      userId,
      institutionId: params.institutionId,
      action: 'ai.generated',
      resource: 'document',
      resourceId: document.id,
      metadata: { moduleType: this.moduleType, provider: aiProvider.provider, wordCount },
    })

    return {
      content: result.content,
      tokensInput: result.tokensInput,
      tokensOutput: result.tokensOutput,
      durationMs: result.durationMs,
      documentId: document.id,
      model: result.model,
      provider: aiProvider.provider,
    }
  }

  protected levelLabel(level: AcademicLevel): string {
    const map: Record<AcademicLevel, string> = {
      ND: 'National Diploma (ND)',
      HND: 'Higher National Diploma (HND)',
      BSC: 'Bachelor of Science (BSc)',
      MSC: 'Master of Science (MSc)',
      MBA: 'Master of Business Administration (MBA)',
      PHD: 'Doctor of Philosophy (PhD)',
      PROFESSIONAL: 'Professional / Continuing Education',
    }
    return map[level]
  }

  protected bloomLabel(level?: BloomLevelParam): string {
    if (!level) return ''
    const map: Record<BloomLevelParam, string> = {
      REMEMBER: 'Remember (recall facts and basic concepts)',
      UNDERSTAND: 'Understand (explain ideas or concepts)',
      APPLY: 'Apply (use information in new situations)',
      ANALYSE: 'Analyse (draw connections among ideas)',
      EVALUATE: 'Evaluate (justify a decision or course of action)',
      CREATE: 'Create (produce new or original work)',
    }
    return map[level]
  }

  protected commonInstructions(params: GenerationParams): string {
    const parts: string[] = []
    if (params.language && params.language !== 'English') parts.push(`Write in ${params.language}.`)
    if (params.tone) parts.push(`Tone: ${params.tone}.`)
    if (params.wordCount) parts.push(`Target approximately ${params.wordCount} words.`)
    if (params.includeExamples) parts.push('Include practical examples.')
    if (params.includeCaseStudies) parts.push('Include relevant case studies from African/Nigerian higher education context where applicable.')
    if (params.includeExercises) parts.push('Include practice exercises.')
    if (params.includeReferences) parts.push(`Include references in ${params.referenceStyle ?? 'APA 7th'} format.`)
    if (params.customInstructions) parts.push(params.customInstructions)
    return parts.join(' ')
  }

  protected sourceContextBlock(params: GenerationParams): string {
    if (!params.sourceContext) return ''
    return `\n\n---\n## UPLOADED SOURCE MATERIALS (MUST USE)\n\nIMPORTANT INSTRUCTIONS FOR SOURCE MATERIALS:\n1. You MUST base your output primarily on the content from these uploaded materials.\n2. You MUST explicitly cite these source files by name in the References section.\n3. Draw specific facts, definitions, and examples DIRECTLY from the text below.\n4. Do NOT ignore these materials — they are the primary source for this content.\n\n${params.sourceContext.slice(0, 30_000)}\n\n---\n`
  }
}
