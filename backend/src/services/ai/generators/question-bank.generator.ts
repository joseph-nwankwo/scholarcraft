import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class QuestionBankGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'QUIZ'
  readonly moduleType = 'question-bank'

  buildTitle(params: GenerationParams): string {
    return `Question Bank: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert academic assessment designer specialising in Nigerian and African higher education.
You create comprehensive question banks with multiple question types that rigorously test student understanding at the specified cognitive level.
Format your output in clean, well-structured Markdown.
Strictly follow the question type mix, quantity, and mark allocation specified in the request.
Always include a complete ANSWER KEY and MARKING GUIDE section at the end.`
  }

  buildPrompt(params: GenerationParams): string {
    const bloom = params.bloomLevel
      ? `Cognitive Level (Bloom's): ${this.bloomLabel(params.bloomLevel)}\n`
      : ''
    const difficulty = params.difficulty ?? 'MIXED'
    const course = params.courseTitle
      ? `Course: ${params.courseTitle}${params.courseCode ? ` (${params.courseCode})` : ''}\n`
      : ''

    return `Generate a question bank with the EXACT specifications below.

Topic: ${params.topic}
${course}Academic Level: ${this.levelLabel(params.academicLevel)}
${bloom}Difficulty: ${difficulty}

SPECIFICATIONS:
${params.customInstructions ?? ''}
${this.sourceContextBlock(params)}

STRICT FORMATTING RULES — follow these exactly:

**Multiple Choice (MCQ):**
**Q[n].** [Question text]
A) [Option]  B) [Option]  C) [Option]  D) [Option]

**True / False:**
**Q[n].** _________ [Statement that is clearly TRUE or FALSE]

**Fill in the Blank:**
**Q[n].** [Sentence with __________ representing the missing word/phrase]

**Short Answer:**
**Q[n].** [Question] *(Expected: 2–4 sentences)*

**Essay:**
**Q[n].** [Question] *(Expected: [word count] words — key points: [list])*

**Matching:**
**Q[n].** Match each item in Column A with the correct item in Column B.
| Column A | Column B |
|----------|----------|
| 1. ... | A. ... |

**Scenario-based:**
**Q[n].** *Scenario:* [Detailed real-world situation relevant to the topic]
[Question about the scenario]

**Comprehension:**
**Q[n].** *Read the following passage:*
> [2–4 sentence passage]
[Question about the passage]

---

## ANSWER KEY

Provide the correct answer for EVERY question, numbered to match.
For MCQ: state the letter and a one-sentence explanation.
For T/F: state TRUE or FALSE and a one-sentence justification.
For Fill in the Blank: state the exact answer.
For Short/Essay/Scenario/Comprehension: provide a model answer with key marking points.

---

## MARKING GUIDE

| Q# | Type | Marks | Key Marking Points |
|----|------|-------|--------------------|
[One row per question]

---

Replace ALL placeholder text with real, accurate questions and answers about "${params.topic}" appropriate for ${this.levelLabel(params.academicLevel)} students in Nigeria.`
  }
}

export const questionBankGenerator = new QuestionBankGenerator()
