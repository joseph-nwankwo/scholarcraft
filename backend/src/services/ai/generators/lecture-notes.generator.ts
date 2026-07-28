import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class LectureNotesGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'LECTURE_NOTE'
  readonly moduleType = 'lecture-notes'

  buildTitle(params: GenerationParams): string {
    return `Lecture Notes: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert academic lecturer and curriculum developer specializing in Nigerian and African higher education.
You produce comprehensive, pedagogically sound lecture notes that align with NUC (National Universities Commission) standards.
Format your output in clean, structured Markdown with clear headings, bullet points, and numbered lists.
Always write at the appropriate academic level with proper terminology.`
  }

  buildPrompt(params: GenerationParams): string {
    const course = params.courseTitle
      ? `Course: ${params.courseTitle}${params.courseCode ? ` (${params.courseCode})` : ''}`
      : ''
    const bloom = params.bloomLevel ? `\nCognitive Level (Bloom's Taxonomy): ${this.bloomLabel(params.bloomLevel)}` : ''
    const extra = this.commonInstructions(params)

    return `Generate comprehensive lecture notes for the following:

Topic: ${params.topic}
${course}
Academic Level: ${this.levelLabel(params.academicLevel)}
Subject Area: ${params.subject ?? 'General'}
Duration: ${params.duration ?? 90} minutes${bloom}
${extra ? `\nAdditional Requirements: ${extra}` : ''}${this.sourceContextBlock(params)}

Structure the lecture notes with ALL of the following sections:

# [Topic Title]

## Learning Objectives
(3-7 measurable objectives using action verbs appropriate to the Bloom's level)

## Introduction
(Engaging opening, context, relevance to students' lives/careers)

## Prerequisite Knowledge
(What students should already know)

## Main Content
(Divide into logical subsections with clear headings. Include:
- Detailed explanations of concepts
- Definitions of key terms
- Diagrams described in text if applicable
- Step-by-step processes where relevant)

${params.includeExamples ? `## Worked Examples
(Minimum 3 detailed worked examples with step-by-step solutions)

` : ''}${params.includeCaseStudies ? `## Case Studies
(Minimum 2 real-world case studies, preferably from Nigeria/Africa context)

` : ''}## Key Terms and Definitions
(Glossary of important terms introduced in this lecture)

## Summary
(Concise recap of main points, 5-8 bullet points)

${params.includeExercises ? `## Practice Exercises
(5-10 exercises ranging from basic recall to application, with answers/solutions)

` : ''}## Review Questions
(5 questions for self-assessment)

${params.includeReferences ? `## References and Further Reading
(Minimum 5 academic references in ${params.referenceStyle ?? 'APA 7th'} format, including at least 2 Nigerian/African sources where available)

` : ''}## Suggested Next Topic
(What to cover in the next lecture)

Make the content rigorous, accurate, and appropriate for ${this.levelLabel(params.academicLevel)} students in Nigeria.`
  }
}

export const lectureNotesGenerator = new LectureNotesGenerator()
