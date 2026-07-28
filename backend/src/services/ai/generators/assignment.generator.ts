import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class AssignmentGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'ASSIGNMENT'
  readonly moduleType = 'assignment'

  buildTitle(params: GenerationParams): string {
    return `Assignment: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert assessment designer for Nigerian higher education institutions.
You create rigorous, fair, and academically appropriate assignments that test student understanding at the specified cognitive level.
Format output in clean Markdown. Include clear instructions, marking criteria, and submission guidelines.
Adapt the assignment structure to match the assignment type specified by the lecturer.`
  }

  buildPrompt(params: GenerationParams): string {
    const n          = params.numberOfQuestions ?? 5
    const bloom      = params.bloomLevel ? `Cognitive Level: ${this.bloomLabel(params.bloomLevel)}\n` : ''
    const difficulty = params.difficulty ?? 'MIXED'
    const extra      = this.commonInstructions(params)

    // Parse assignment type from customInstructions prefix
    const ci          = params.customInstructions ?? ''
    const typeMatch   = ci.match(/Assignment type:\s*([^.]+)\./)
    const assignType  = typeMatch ? typeMatch[1].trim() : 'Standard'
    const groupMatch  = ci.match(/Submission:\s*([^.]+)\./)
    const groupMode   = groupMatch ? groupMatch[1].trim() : 'Individual'
    const modeMatch   = ci.match(/Submission method:\s*([^.]+)\./)
    const subMode     = modeMatch ? modeMatch[1].trim() : 'Hard copy'
    const marksMatch  = ci.match(/Total marks:\s*(\d+)\./)
    const totalMarks  = marksMatch ? marksMatch[1] : '100'
    const wcMatch     = ci.match(/Expected word count:\s*(\d+) words\./)
    const wordCount   = wcMatch ? `${wcMatch[1]} words` : ''

    const structure = this.getStructure(assignType, n, params.topic)

    return `Generate a comprehensive ${assignType} for the following:
${this.sourceContextBlock(params)}
Topic: ${params.topic}
Course: ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}
Academic Level: ${this.levelLabel(params.academicLevel)}
${bloom}Difficulty: ${difficulty}
Assignment Type: ${assignType}
Number of Tasks: ${n}
Total Marks: ${totalMarks}
Submission: ${groupMode}
Submission Method: ${subMode}
${wordCount ? `Expected Length: ${wordCount}` : ''}
${extra ? `\nAdditional Instructions: ${extra}` : ''}

Structure the assignment as follows:

# Assignment: ${params.topic}

## Assignment Information
| | |
|--|--|
| **Course** | ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''} |
| **Academic Level** | ${this.levelLabel(params.academicLevel)} |
| **Assignment Type** | ${assignType} |
| **Total Marks** | ${totalMarks} |
| **Submission** | ${groupMode} |
| **Submission Method** | ${subMode} |
${wordCount ? `| **Expected Length** | ${wordCount} |` : ''}
| **Submission Deadline** | [Date to be announced] |

## General Instructions
1. Read all tasks carefully before attempting
2. Ensure you understand what is required before starting
3. Cite all sources used in ${params.referenceStyle ?? 'APA 7th'} format
4. Submit on or before the deadline; late submissions attract a 5-mark deduction per day
5. Plagiarism will result in a mark of zero
${groupMode.toLowerCase().includes('group') ? '6. All group members must contribute equally and sign a contribution statement' : '6. This is an individual assignment — no collaboration is permitted'}

${structure}

## Marking Rubric

${this.getRubric(assignType, totalMarks)}

## Recommended Resources
(Provide minimum 3 key references students should consult for this assignment in ${params.referenceStyle ?? 'APA 7th'} format, preferably including Nigerian/African sources)

Ensure all tasks are appropriate for ${this.levelLabel(params.academicLevel)} students and test at the ${difficulty.toLowerCase()} difficulty level.`
  }

  private getStructure(type: string, n: number, topic: string): string {
    const t = type.toLowerCase()

    if (t.includes('essay')) {
      return `## Essay Task (100 marks)

Write a well-structured essay on the following:

**Essay Question:**
[Generate a challenging, thought-provoking essay question on "${topic}" that requires critical analysis and synthesis]

**Requirements:**
- Present a clear argument or thesis
- Support your argument with evidence and examples
- Demonstrate critical analysis and evaluation
- Structure your essay with introduction, body paragraphs, and conclusion
- Reference all sources cited

[Generate ${n} additional essay sub-questions or guiding points students must address]`
    }

    if (t.includes('research report') || t.includes('literature review')) {
      return `## Research Task

### Part 1: Introduction and Background (20 marks)
[Generate 2 questions requiring students to contextualise the research topic and state objectives]

### Part 2: Literature Review (30 marks)
[Generate ${Math.ceil(n * 0.4)} questions requiring students to critically review existing literature on "${topic}"]

### Part 3: Analysis and Discussion (35 marks)
[Generate ${Math.ceil(n * 0.35)} questions requiring students to analyse findings and discuss implications]

### Part 4: Conclusions and Recommendations (15 marks)
[Generate 2 questions asking students to summarise findings and make evidence-based recommendations]`
    }

    if (t.includes('case study')) {
      return `## Case Study

### Background
[Generate a realistic, detailed case study scenario relevant to "${topic}" in a Nigerian/African context — 3-4 paragraphs]

### Case Study Questions

**Part A: Situation Analysis (30 marks)**
[Generate ${Math.ceil(n * 0.3)} questions asking students to identify and describe key issues in the case]

**Part B: Critical Analysis (40 marks)**
[Generate ${Math.ceil(n * 0.4)} questions requiring deeper analysis applying relevant theories and frameworks to the case]

**Part C: Recommendations (30 marks)**
[Generate ${Math.ceil(n * 0.3)} questions asking students to propose and justify practical solutions]`
    }

    if (t.includes('lab') || t.includes('practical')) {
      return `## Laboratory / Practical Report

### Aim and Objectives
[Generate a clear aim and 3-5 measurable objectives for a practical experiment/activity on "${topic}"]

### Materials and Methods
[List equipment/materials needed and describe the procedure students should follow]

### Results (30 marks)
[Generate ${Math.ceil(n * 0.3)} tasks asking students to record and present their observations/data]

### Discussion (40 marks)
[Generate ${Math.ceil(n * 0.4)} questions asking students to interpret results, explain trends, and link to theory]

### Conclusions and Error Analysis (20 marks)
[Generate tasks for students to state conclusions and discuss possible sources of error]

### Post-Practical Questions (10 marks)
[Generate ${Math.ceil(n * 0.1)} short questions testing understanding of the practical concepts]`
    }

    if (t.includes('group project') || t.includes('design project')) {
      return `## Project Brief

### Project Overview
[Generate a detailed project brief for "${topic}" suitable for group work — include context, problem statement, and deliverables]

### Project Phases

**Phase 1: Planning and Research (25 marks)**
[Generate tasks requiring groups to define scope, assign roles, and conduct background research]

**Phase 2: Development / Implementation (40 marks)**
[Generate ${Math.ceil(n * 0.4)} tasks for the core project work — design, build, analyse, or create as appropriate to the topic]

**Phase 3: Evaluation and Reflection (20 marks)**
[Generate tasks asking groups to evaluate their work against objectives and reflect on the process]

**Phase 4: Presentation and Documentation (15 marks)**
[Specify requirements for the final report and/or presentation to the class]`
    }

    if (t.includes('presentation')) {
      return `## Presentation Assignment

### Topic and Scope
[Generate a specific presentation topic on "${topic}" with clear scope guidelines]

### Presentation Requirements
- Duration: [X] minutes per student/group
- Format: [Slides / Poster / Live demonstration]
- Q&A session: [X] minutes

### Content Requirements (60 marks)
[Generate ${Math.ceil(n * 0.6)} specific content points or questions students must address in their presentation]

### Delivery and Structure (25 marks)
[Specify expectations for organisation, clarity, visual aids, and time management]

### Q&A Performance (15 marks)
[Describe how students will be assessed on responding to questions from the audience and lecturer]`
    }

    if (t.includes('portfolio')) {
      return `## Portfolio Assessment

### Portfolio Overview
Students will compile a portfolio demonstrating their learning and progress on "${topic}" over the course of the semester.

### Required Portfolio Components

**Component 1: Reflective Journal (25 marks)**
[Generate weekly/bi-weekly reflection prompts students must respond to — minimum ${Math.ceil(n * 0.3)} entries]

**Component 2: Practical Work Samples (35 marks)**
[Generate ${Math.ceil(n * 0.35)} specific tasks or artefacts students must include and annotate]

**Component 3: Critical Analysis (25 marks)**
[Generate prompts requiring students to critically analyse their own work and identify areas for improvement]

**Component 4: Personal Learning Statement (15 marks)**
[Generate a final reflective question asking students to articulate their overall learning journey]`
    }

    if (t.includes('problem') || t.includes('numerical')) {
      return `## Problem-solving Assignment

### Section A: Conceptual Questions (${Math.ceil(Number('100') * 0.3)} marks)
[Generate ${Math.ceil(n * 0.3)} conceptual questions on "${topic}" that test understanding of underlying principles]

### Section B: Worked Problems (${Math.ceil(Number('100') * 0.5)} marks)
[Generate ${Math.ceil(n * 0.5)} numerical/computational problems of varying difficulty — show all formulae, given data, and required format]

### Section C: Applied Problem (${Math.ceil(Number('100') * 0.2)} marks)
[Generate 1-2 real-world application problems requiring students to select appropriate methods and justify their approach]

**Note:** Show all working for full marks. Correct answers without working earn no credit.`
    }

    // Default: Standard 3-section format
    const shortN    = Math.ceil(n * 0.3)
    const essayN    = Math.ceil(n * 0.4)
    return `## Section A: Short Answer Questions (30 marks)
(${shortN} questions, 2–5 marks each)

[Generate ${shortN} targeted short-answer questions on "${topic}" testing recall and basic understanding]

## Section B: Long Answer / Essay Questions (40 marks)
(${essayN} questions, 10–15 marks each)

[Generate ${essayN} essay or long-answer questions requiring critical analysis and synthesis of concepts related to "${topic}"]

## Section C: Research / Applied Task (30 marks)
(1–2 extended tasks)

[Generate 1–2 extended tasks that require students to apply knowledge of "${topic}" to a real-world or research scenario, demonstrating higher-order thinking]`
  }

  private getRubric(type: string, totalMarks: string): string {
    const t = type.toLowerCase()

    if (t.includes('problem') || t.includes('numerical') || t.includes('lab') || t.includes('practical')) {
      return `| Criteria | Full marks | Partial | Minimal | Zero |
|----------|-----------|---------|---------|------|
| Correctness of method | All steps correct | Minor errors | Significant errors | Wrong method |
| Accuracy of result | Correct answer | Rounding error only | Major numerical error | No attempt |
| Working shown | All working clear | Most working shown | Little working | No working |
| Units and notation | All correct | Minor errors | Inconsistent | Absent |

**Total: ${totalMarks} marks**`
    }

    if (t.includes('presentation')) {
      return `| Criteria | Excellent (90–100%) | Good (70–89%) | Satisfactory (50–69%) | Below Standard (<50%) |
|----------|-------|------|-----|------|
| Content accuracy & depth | Comprehensive, accurate | Mostly accurate, some depth | Basic, limited depth | Inaccurate or superficial |
| Organisation & structure | Logical, well-structured | Generally organised | Some structure | Poorly organised |
| Delivery & communication | Clear, confident, engaging | Clear, minor issues | Understandable | Unclear or unprepared |
| Visual aids | Professional, enhances message | Good, minor issues | Adequate | Poor or absent |
| Q&A handling | Precise, insightful answers | Adequate answers | Basic answers | Unable to respond |

**Total: ${totalMarks} marks**`
    }

    // Default rubric for essay/report/case study/standard
    return `| Criteria | Excellent (90–100%) | Good (70–89%) | Satisfactory (50–69%) | Below Standard (<50%) |
|----------|-------|------|-----|------|
| Knowledge & Understanding | Demonstrates thorough, accurate knowledge | Mostly accurate, good coverage | Basic understanding, gaps evident | Limited or inaccurate knowledge |
| Analysis & Critical Thinking | Deep, insightful analysis with evidence | Good analysis, mostly evidence-based | Some analysis, limited evidence | Descriptive only, no analysis |
| Application | Confidently applies concepts to context | Applies concepts with minor errors | Limited application | No meaningful application |
| Organisation & Presentation | Excellent structure, logical flow | Well-organised | Adequate organisation | Poorly organised |
| Referencing (${type.includes('referenceStyle') ? 'APA 7th' : 'APA 7th'}) | All sources correctly cited | Minor citation errors | Some sources cited | No referencing |

**Total: ${totalMarks} marks**`
  }
}

export const assignmentGenerator = new AssignmentGenerator()
