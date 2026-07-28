import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class QuizGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'QUIZ'
  readonly moduleType = 'quiz'

  buildTitle(params: GenerationParams): string {
    return `Quiz: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert academic assessment specialist for Nigerian higher education.
You create well-designed quizzes with varied question types that effectively measure student understanding.
Format in clean Markdown. Include answer keys with explanations.`
  }

  buildPrompt(params: GenerationParams): string {
    const n = params.numberOfQuestions ?? 20
    const bloom = params.bloomLevel ? `Cognitive Level: ${this.bloomLabel(params.bloomLevel)}\n` : ''
    const difficulty = params.difficulty ?? 'MIXED'
    const extra = this.commonInstructions(params)
    const mcq = Math.ceil(n * 0.4)
    const tf = Math.ceil(n * 0.2)
    const fill = Math.ceil(n * 0.2)
    const short = n - mcq - tf - fill

    return `Generate a comprehensive quiz with ${n} questions on the following:

Topic: ${params.topic}
Course: ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}
Academic Level: ${this.levelLabel(params.academicLevel)}
${bloom}Difficulty: ${difficulty}
${extra ? `Additional Requirements: ${extra}` : ''}${this.sourceContextBlock(params)}

Question Distribution:
- Multiple Choice (MCQ): ${mcq} questions
- True/False: ${tf} questions
- Fill in the Blank: ${fill} questions
- Short Answer: ${short} questions

# Quiz: ${params.topic}

**Time Allowed:** [Recommended time]
**Total Marks:** ${n}
**Instructions:** Choose the best answer for MCQ. Write TRUE or FALSE for T/F questions. Fill in the blanks. Answer short questions concisely.

---

## Section A: Multiple Choice Questions (${mcq} marks)
*Choose the most correct answer (A, B, C, or D)*

${Array.from({ length: mcq }, (_, i) => `**${i + 1}.** [MCQ question about ${params.topic}]
   A) [Option A]
   B) [Option B]
   C) [Option C]
   D) [Option D]
`).join('\n')}

## Section B: True or False (${tf} marks)
*Write TRUE or FALSE in the space provided*

${Array.from({ length: tf }, (_, i) => `**${mcq + i + 1}.** ________ [True/False statement about ${params.topic}]
`).join('\n')}

## Section C: Fill in the Blank (${fill} marks)
*Complete each sentence with the correct word or phrase*

${Array.from({ length: fill }, (_, i) => `**${mcq + tf + i + 1}.** [Sentence with a __________ blank about ${params.topic}]
`).join('\n')}

## Section D: Short Answer Questions (${short} marks)
*Answer each question in 2-4 sentences*

${Array.from({ length: short }, (_, i) => `**${mcq + tf + fill + i + 1}.** [Short answer question about ${params.topic}]
`).join('\n')}

---

## ANSWER KEY

### Section A — MCQ Answers
| Q | Answer | Explanation |
|---|--------|-------------|
${Array.from({ length: mcq }, (_, i) => `| ${i + 1} | [X] | [Brief explanation why this is correct] |`).join('\n')}

### Section B — True/False Answers
| Q | Answer | Explanation |
|---|--------|-------------|
${Array.from({ length: tf }, (_, i) => `| ${mcq + i + 1} | [TRUE/FALSE] | [Explanation] |`).join('\n')}

### Section C — Fill in the Blank Answers
${Array.from({ length: fill }, (_, i) => `**${mcq + tf + i + 1}.** [Correct answer]`).join('\n')}

### Section D — Short Answer Model Answers
${Array.from({ length: short }, (_, i) => `**${mcq + tf + fill + i + 1}.** [Model answer in 2-4 sentences]`).join('\n')}

Replace all placeholder text with actual, accurate questions and answers about "${params.topic}" at ${this.levelLabel(params.academicLevel)} level.
Ensure questions are ${difficulty.toLowerCase()} difficulty and cover all major aspects of the topic.`
  }
}

export const quizGenerator = new QuizGenerator()
