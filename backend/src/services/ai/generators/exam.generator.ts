import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class ExamGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'EXAM'
  readonly moduleType = 'exam'

  buildTitle(params: GenerationParams): string {
    const subject = params.subject ?? params.topic
    return `Examination: ${subject}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are a senior academic examiner with expertise in Nigerian university examination standards (NUC guidelines).
You produce rigorous, fair, and properly structured examination papers that comply with university examination regulations.
Format in clean Markdown. Include all standard examination paper components: cover page details, instructions, all questions with mark allocations, and a complete marking scheme.`
  }

  buildPrompt(params: GenerationParams): string {
    const n          = params.numberOfQuestions ?? 30
    const duration   = params.duration ?? 180
    const bloom      = params.bloomLevel ? `Primary Cognitive Level: ${this.bloomLabel(params.bloomLevel)}\n` : ''
    const difficulty = params.difficulty ?? 'MIXED'
    const examType   = params.teachingStyle ?? 'End-of-semester examination'

    // Parse extra settings from customInstructions
    const ci         = params.customInstructions ?? ''
    const marksMatch = ci.match(/Total marks:\s*(\d+)\./)
    const totalMarks = marksMatch ? marksMatch[1] : '100'
    const passMatch  = ci.match(/Pass mark:\s*(\d+)%\./)
    const passMark   = passMatch ? passMatch[1] : '40'
    const weightMatch = ci.match(/Section weighting:\s*([^.]+)\./)
    const sectionWeight = weightMatch ? weightMatch[1].trim() : 'Section A: 40% Objective · Section B: 60% Theory'

    const structure = this.buildStructure(n, sectionWeight, params.topic, totalMarks)

    return `Generate a complete ${examType} question paper for:
${this.sourceContextBlock(params)}
Subject/Topic: ${params.topic}
Course: ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}
Academic Level: ${this.levelLabel(params.academicLevel)}
Duration: ${duration} minutes
Total Questions: ${n}
Total Marks: ${totalMarks}
Pass Mark: ${passMark}%
Difficulty: ${difficulty}
${bloom}Section Weighting: ${sectionWeight}
${ci ? `Additional Instructions: ${ci}` : ''}

Produce a complete examination paper in the following format:

---

# ${params.courseTitle ?? params.topic}
# ${examType.toUpperCase()}

| | |
|---|---|
| **Course Code** | ${params.courseCode ?? 'XXX 000'} |
| **Course Title** | ${params.courseTitle ?? params.topic} |
| **Time Allowed** | ${duration} minutes |
| **Total Marks** | ${totalMarks} |
| **Pass Mark** | ${passMark}% |
| **Academic Level** | ${this.levelLabel(params.academicLevel)} |
| **Semester** | [Semester] |
| **Session** | [Academic Session] |

---

## INSTRUCTIONS TO CANDIDATES

1. Read all instructions carefully before attempting any question.
2. Write your **Student Matriculation Number and Full Name** clearly at the top of your answer booklet.
3. Candidates are NOT allowed to use unauthorised materials including mobile phones, programmable calculators, or textbooks unless otherwise stated.
4. All answers must be written in **blue or black ink**. Pencil may only be used for diagrams.
5. Budget your time wisely — you have ${duration} minutes to complete the paper.

${structure}

---

## MARKING SCHEME / ANSWER KEY

${this.buildMarkingScheme(n, sectionWeight, params.topic)}

Replace ALL placeholder text with actual, rigorous questions and model answers about "${params.topic}" at ${this.levelLabel(params.academicLevel)} level.
Ensure the paper tests ${difficulty.toLowerCase()} difficulty concepts thoroughly and covers all major aspects of the topic.`
  }

  private buildStructure(n: number, sectionWeight: string, topic: string, totalMarks: string): string {
    const sw = sectionWeight.toLowerCase()

    if (sw.includes('objective only') || sw.includes('objective questions only')) {
      const mcq   = Math.ceil(n * 0.6)
      const tf    = Math.ceil(n * 0.2)
      const fill  = n - mcq - tf
      return `---

## SECTION A: MULTIPLE CHOICE QUESTIONS (${Math.ceil(Number(totalMarks) * 0.6)} Marks)
*Choose the most correct answer (a, b, c, or d). Each question carries 1 mark.*

${Array.from({ length: mcq }, (_, i) => `**${i + 1}.** [MCQ question on ${topic}]
   (a) [Option A]   (b) [Option B]   (c) [Option C]   (d) [Option D]
`).join('\n')}

## SECTION B: TRUE OR FALSE (${Math.ceil(Number(totalMarks) * 0.2)} Marks)
*Write TRUE or FALSE in the space provided. Each question carries 1 mark.*

${Array.from({ length: tf }, (_, i) => `**${mcq + i + 1}.** ________ [Statement about ${topic}]
`).join('\n')}

## SECTION C: FILL IN THE BLANK (${Math.ceil(Number(totalMarks) * 0.2)} Marks)
*Fill each blank with the correct term or phrase.*

${Array.from({ length: fill }, (_, i) => `**${mcq + tf + i + 1}.** [Sentence about ${topic} with a __________ blank]
`).join('\n')}`
    }

    if (sw.includes('theory') && sw.includes('essay') && !sw.includes('objective')) {
      const essayN = Math.min(n, 6)
      const marks  = Math.floor(Number(totalMarks) / essayN)
      return `---

## SECTION A: COMPULSORY QUESTIONS (Answer ALL — ${Math.ceil(Number(totalMarks) * 0.4)} Marks)

${Array.from({ length: Math.ceil(n * 0.4) }, (_, i) => `**Question ${i + 1}.** [Short-essay or structured question on ${topic}] (${Math.floor(Number(totalMarks) * 0.4 / Math.ceil(n * 0.4))} marks)

`).join('\n')}

## SECTION B: ESSAY QUESTIONS (Answer any FOUR — ${Math.ceil(Number(totalMarks) * 0.6)} Marks)
*Each question carries ${marks} marks.*

${Array.from({ length: essayN }, (_, i) => `**Question ${Math.ceil(n * 0.4) + i + 1}** (${marks} Marks)

(a) [First part — knowledge and understanding] (${Math.ceil(marks * 0.4)} marks)

(b) [Second part — application and analysis] (${Math.ceil(marks * 0.35)} marks)

(c) [Third part — evaluation or synthesis] (${Math.floor(marks * 0.25)} marks)

---
`).join('\n')}`
    }

    if (sw.includes('section a: mcq') && sw.includes('section b: short answer') && sw.includes('section c: essay')) {
      const mcq   = Math.ceil(n * 0.4)
      const short = Math.ceil(n * 0.3)
      const essay = n - mcq - short
      const mPct  = Math.ceil(Number(totalMarks) * 0.3)
      const sPct  = Math.ceil(Number(totalMarks) * 0.3)
      const ePct  = Number(totalMarks) - mPct - sPct
      return `---

## SECTION A: MULTIPLE CHOICE QUESTIONS (${mPct} Marks)
*Answer ALL questions. Each question carries 1 mark.*

${Array.from({ length: mcq }, (_, i) => `**${i + 1}.** [MCQ question on ${topic}]
   (a) [Option A]   (b) [Option B]   (c) [Option C]   (d) [Option D]
`).join('\n')}

---

## SECTION B: SHORT ANSWER QUESTIONS (${sPct} Marks)
*Answer ALL questions. Answer each in 3–5 sentences.*

${Array.from({ length: short }, (_, i) => `**${mcq + i + 1}.** [Short answer question on ${topic}] (${Math.floor(sPct / short)} marks)
`).join('\n')}

---

## SECTION C: ESSAY / THEORY QUESTIONS (${ePct} Marks)
*Answer any THREE (3) questions. Each question carries ${Math.floor(ePct / 3)} marks.*

${Array.from({ length: essay + 1 }, (_, i) => `**Question ${mcq + short + i + 1}** (${Math.floor(ePct / 3)} Marks)

(a) [First part — knowledge and understanding] (${Math.ceil(ePct / 3 * 0.4)} marks)

(b) [Second part — application] (${Math.ceil(ePct / 3 * 0.35)} marks)

(c) [Third part — critical analysis or evaluation] (${Math.floor(ePct / 3 * 0.25)} marks)

---
`).join('\n')}`
    }

    // Default: 40% Objective / 60% Theory
    const mcq      = 20
    const shortAns = 10
    const theoryN  = Math.max(4, Math.ceil((n - mcq - shortAns) / 2))
    const objMarks = Math.ceil(Number(totalMarks) * 0.4)
    const thMarks  = Number(totalMarks) - objMarks
    const qMarks   = Math.ceil(thMarks / 3)

    return `---

## SECTION A: OBJECTIVE / COMPULSORY QUESTIONS (${objMarks} Marks)
*Answer ALL questions in this section*

### Part I: Multiple Choice Questions (${Math.ceil(objMarks / 2)} Marks)
*Choose the most correct answer (a, b, c, or d). Each question carries 1 mark.*

${Array.from({ length: mcq }, (_, i) => `**${i + 1}.** [MCQ question on ${topic}]
   (a) [Option A]   (b) [Option B]   (c) [Option C]   (d) [Option D]
`).join('\n')}

### Part II: Short Answer Questions (${Math.floor(objMarks / 2)} Marks)
*Answer ALL questions concisely. Each question carries 2 marks.*

${Array.from({ length: shortAns }, (_, i) => `**${mcq + i + 1}.** [Short answer question on ${topic}] (2 marks)
`).join('\n')}

---

## SECTION B: THEORY / ESSAY QUESTIONS (${thMarks} Marks)
*Answer any THREE (3) questions. Each question carries ${qMarks} marks.*

${Array.from({ length: theoryN }, (_, i) => `**Question ${mcq + shortAns + i + 1}** (${qMarks} Marks)

(a) [First part — tests knowledge and understanding of ${topic}] (${Math.ceil(qMarks * 0.4)} marks)

(b) [Second part — application or analysis] (${Math.ceil(qMarks * 0.35)} marks)

(c) [Third part — higher-order thinking: evaluation or synthesis] (${Math.floor(qMarks * 0.25)} marks)

---
`).join('\n')}`
  }

  private buildMarkingScheme(n: number, sectionWeight: string, _topic: string): string {
    const sw  = sectionWeight.toLowerCase()
    const mcq = sw.includes('objective only') ? Math.ceil(n * 0.6) : 20

    return `### Section A — Objective Answers

#### Multiple Choice Answer Key
| Q | Answer | Key explanation |
|---|--------|-----------------|
${Array.from({ length: mcq }, (_, i) => `| ${i + 1} | [a/b/c/d] | [Brief explanation of why this answer is correct] |`).join('\n')}

${!sw.includes('objective only') ? `#### Short Answer Model Answers
${Array.from({ length: 10 }, (_, i) => `**${mcq + i + 1}.** [Model answer — 2 marks: 1 mark for correct concept + 1 mark for explanation/example]`).join('\n')}` : ''}

### Section B — Theory / Essay Marking Guides

${Array.from({ length: 4 }, (_, i) => `**Question ${i + 1} Marking Guide:**

**(a)** — Knowledge & Understanding
- [Key point 1 with explanation]: 2 marks
- [Key point 2 with explanation]: 2 marks
- [Key point 3]: 2 marks
- [Quality of explanation]: 2 marks

**(b)** — Application & Analysis
- [Correct methodology or approach]: 3 marks
- [Accuracy of application]: 2 marks
- [Logical conclusion]: 2 marks

**(c)** — Evaluation & Synthesis
- [Critical evaluation with evidence]: 3 marks
- [Original insight or justified recommendation]: 2 marks

**Total: [marks] marks**
`).join('\n')}`
  }
}

export const examGenerator = new ExamGenerator()
