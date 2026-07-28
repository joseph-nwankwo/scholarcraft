import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class MarkingSchemeGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'MARKING_SCHEME'
  readonly moduleType = 'marking-scheme'

  buildTitle(params: GenerationParams): string {
    return `Marking Scheme: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert academic assessment designer specialising in marking schemes and rubrics for Nigerian higher education.
You produce detailed, objective, and fair marking guides that ensure consistent grading across examiners.
Format in clean Markdown with tables, clear criteria, and specific mark allocations.
Always adapt the rubric structure to match the rubric type and assessment type requested.`
  }

  buildPrompt(params: GenerationParams): string {
    const ci = params.customInstructions ?? ''

    // Parse structured settings injected by the frontend
    const assessType  = this.parse(ci, 'Assessment type')  ?? 'Examination'
    const rubricType  = params.teachingStyle               ?? this.parse(ci, 'Marking scheme type') ?? 'Analytic rubric (multiple criteria)'
    const totalMarks  = this.parse(ci, 'Total marks')      ?? '100'
    const passMark    = this.parse(ci, 'Pass mark')?.replace('%','').trim() ?? '40'
    const grading     = this.parse(ci, 'Grading system')   ?? 'Nigerian university (A 70–100 / B 60–69 / C 50–59 / F <40)'
    const nTasks      = this.parse(ci, 'Number of questions/tasks')
    const bloom       = params.bloomLevel ? `Cognitive Level: ${this.bloomLabel(params.bloomLevel)}\n` : ''
    const extra       = this.commonInstructions(params)

    const header = this.buildHeader(params, assessType, rubricType, totalMarks, passMark)
    const grades  = this.buildGradeBoundaries(grading, passMark)
    const body    = this.buildRubricBody(rubricType, assessType, params.topic, totalMarks, nTasks)

    return `Generate a comprehensive marking scheme / rubric for the following:
${this.sourceContextBlock(params)}
Assessment: ${params.topic}
Course: ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}
Academic Level: ${this.levelLabel(params.academicLevel)}
Assessment Type: ${assessType}
Rubric Type: ${rubricType}
Total Marks: ${totalMarks}
Pass Mark: ${passMark}%
Grading System: ${grading}
${nTasks ? `Number of questions/tasks: ${nTasks}` : ''}
${bloom}${extra ? `Additional Requirements: ${extra}` : ''}

Produce the complete marking scheme in the following format:

${header}

${grades}

---

${body}

---

## SPECIAL MARKING NOTES

### General Guidance
- Award marks for correct understanding even if the phrasing differs from the model answer
- Award method marks where the approach is correct but the result contains a minor error
- Do not penalise for poor spelling or grammar unless language is an explicit assessment criterion
- Do not penalise the same error twice across a script

### Borderline Cases
- Scripts scoring within 2 marks of the pass mark must be double-marked
- All failed scripts should be blind second-marked before results are confirmed
- Disputes must be escalated to the Module Coordinator within 48 hours of marking

### Academic Integrity
- Confirmed plagiarism: deduct 50% from the question mark; escalate to Academic Integrity Committee
- Scripts identical to another candidate's must be withheld pending investigation

Replace ALL placeholder text with actual subject-specific model answers, criteria, and mark allocations for "${params.topic}" at ${this.levelLabel(params.academicLevel)} level.`
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private parse(text: string, key: string): string | undefined {
    const m = text.match(new RegExp(`${key}:\\s*([^.]+)\\.`))
    return m ? m[1].trim() : undefined
  }

  private buildHeader(
    params: GenerationParams,
    assessType: string,
    rubricType: string,
    totalMarks: string,
    passMark: string,
  ): string {
    return `# Marking Scheme: ${params.topic}
## ${assessType} — ${params.courseTitle ?? '[Course Name]'}${params.courseCode ? ` (${params.courseCode})` : ''}

| | |
|---|---|
| **Course Code** | ${params.courseCode ?? '[Course Code]'} |
| **Assessment** | ${assessType} |
| **Rubric Type** | ${rubricType} |
| **Total Marks** | ${totalMarks} |
| **Pass Mark** | ${passMark}% (${Math.round(Number(totalMarks) * Number(passMark) / 100)} marks) |
| **Academic Level** | ${this.levelLabel(params.academicLevel)} |

## Examiner's Instructions
1. Read this marking scheme in full before marking any script
2. Apply the scheme consistently — do not deviate without Module Coordinator approval
3. Mark positively: award marks for what candidates know, not what they don't
4. Use the full mark range; do not cluster marks in the middle
5. Record marks clearly for each part/question before totalling
6. Complete the cover sheet and sign each script after marking`
  }

  private buildGradeBoundaries(grading: string, passMark: string): string {
    const g = grading.toLowerCase()

    if (g.includes('nigerian university') || g.includes('70')) {
      return `## Grade Boundaries
| Grade | Mark Range | Classification |
|-------|-----------|----------------|
| A | 70–100 | Distinction / First Class |
| B | 60–69 | Credit / Second Class Upper |
| C | 50–59 | Pass / Second Class Lower |
| D | 45–49 | Marginal Pass / Third Class |
| F | 0–44 | Fail |
> **Pass mark: ${passMark}%**`
    }

    if (g.includes('uk') || g.includes('honours')) {
      return `## Grade Boundaries
| Grade | Mark Range | Classification |
|-------|-----------|----------------|
| First | 70–100 | First Class Honours |
| 2:1 | 60–69 | Second Class Upper |
| 2:2 | 50–59 | Second Class Lower |
| Third | 40–49 | Third Class |
| Fail | 0–39 | Fail |
> **Pass mark: ${passMark}%**`
    }

    if (g.includes('pass / merit') || g.includes('distinction')) {
      return `## Grade Boundaries
| Grade | Mark Range |
|-------|-----------|
| Distinction | 70–100 |
| Merit | 55–69 |
| Pass | ${passMark}–54 |
| Fail | 0–${Number(passMark) - 1} |`
    }

    if (g.includes('competency')) {
      return `## Competency Judgement
| Judgement | Criteria |
|-----------|---------|
| Competent (C) | Meets all required performance indicators |
| Not Yet Competent (NYC) | Does not meet one or more performance indicators |
> Candidates rated NYC must be given feedback and an opportunity to resubmit.`
    }

    // Standard percentage / CGPA fallback
    return `## Grade Boundaries
| Grade | Mark Range | GPA Points |
|-------|-----------|-----------|
| A | 90–100 | 5.0 / 4.0 |
| B | 80–89 | 4.0 / 3.0 |
| C | 70–79 | 3.0 / 2.0 |
| D | 60–69 | 2.0 / 1.0 |
| F | 0–59 | 0.0 |
> **Pass mark: ${passMark}%**`
  }

  private buildRubricBody(
    rubricType: string,
    assessType: string,
    topic: string,
    totalMarks: string,
    nTasks: string | undefined,
  ): string {
    const rt = rubricType.toLowerCase()
    const n  = nTasks ? Number(nTasks) : 5
    const tm = Number(totalMarks)

    // ── Holistic ──────────────────────────────────────────────────────────────
    if (rt.includes('holistic')) {
      return `## Holistic Performance Bands

| Band | Mark Range | Descriptor |
|------|-----------|------------|
| **Outstanding** | ${Math.ceil(tm * 0.9)}–${tm} | Demonstrates exceptional mastery of ${topic}. Original, insightful responses. No significant errors. Exceeds expectations at this level. |
| **Excellent** | ${Math.ceil(tm * 0.75)}–${Math.ceil(tm * 0.9) - 1} | Strong, accurate knowledge. Well-structured. Minor omissions only. Good use of examples and critical analysis. |
| **Good** | ${Math.ceil(tm * 0.6)}–${Math.ceil(tm * 0.75) - 1} | Solid understanding of key concepts. Some gaps. Adequate structure and examples. Limited critical analysis. |
| **Satisfactory** | ${Math.ceil(tm * 0.5)}–${Math.ceil(tm * 0.6) - 1} | Basic understanding demonstrated. Lacks depth in several areas. Some errors. Structure adequate. |
| **Marginal Pass** | ${Math.ceil(tm * 0.4)}–${Math.ceil(tm * 0.5) - 1} | Minimum acceptable understanding. Multiple gaps. Errors present but core concepts attempted. |
| **Fail** | 0–${Math.ceil(tm * 0.4) - 1} | Inadequate understanding of ${topic}. Major errors. Incoherent responses. Does not meet minimum standards. |

## Holistic Marking Checklist

When assigning a band, ask:
- [ ] Does the response demonstrate accurate knowledge of **${topic}**?
- [ ] Is the response well-structured with a clear argument or methodology?
- [ ] Are relevant examples, evidence, or calculations provided?
- [ ] Does the candidate demonstrate critical thinking beyond recall?
- [ ] Is the level of detail appropriate for ${assessType.toLowerCase()} at this academic level?`
    }

    // ── Single-point / Pass-fail ───────────────────────────────────────────────
    if (rt.includes('single-point') || rt.includes('pass/fail')) {
      return `## Single-Point Rubric

For each criterion below, mark **Met** or **Not Met**. Each criterion is worth ${Math.floor(tm / Math.max(n, 4))} marks.

| Criterion | Performance Standard | Met | Not Met | Notes |
|-----------|---------------------|-----|---------|-------|
${Array.from({ length: Math.max(n, 4) }, (_, i) => `| Criterion ${i + 1} | [Describe the specific standard expected for ${topic} — what does "meeting" this criterion look like?] | ☐ | ☐ | |`).join('\n')}

**Scoring:** Award full marks for Met; zero for Not Met. Partial marks may only be awarded with written justification.

## Feedback Prompts
- For each "Not Met": [Specific, actionable feedback for the candidate]
- Strengths to acknowledge: [Note what the candidate did well even where criteria were not met]`
    }

    // ── Developmental ────────────────────────────────────────────────────────
    if (rt.includes('developmental')) {
      return `## Developmental Rubric

This rubric tracks growth across four developmental stages. Mark where the candidate currently sits on each dimension.

| Dimension | Beginning (1) | Developing (2) | Achieving (3) | Excelling (4) | Score |
|-----------|--------------|----------------|---------------|---------------|-------|
| **Knowledge of ${topic}** | Superficial or inaccurate knowledge | Basic knowledge, some gaps | Solid, accurate knowledge | Comprehensive, nuanced mastery | /4 |
| **Application** | Unable to apply concepts | Limited application with support | Applies concepts in familiar contexts | Applies independently in novel contexts | /4 |
| **Critical Analysis** | Descriptive only | Some analysis evident | Clear analysis with evidence | Sophisticated, original analysis | /4 |
| **Communication** | Unclear or disorganised | Understandable but needs improvement | Clear and well-organised | Polished, persuasive presentation | /4 |
| **Use of Evidence** | No evidence cited | Minimal or weak evidence | Adequate evidence, some citation errors | Strong, well-cited evidence base | /4 |

**Scoring:** Multiply total (out of 20) × ${Math.floor(tm / 20)} to get mark out of ${tm}.

## Developmental Feedback Section
*Complete for each candidate:*

**Current stage:** [Beginning / Developing / Achieving / Excelling]

**Key strengths:**

**Priority areas for growth:**

**Recommended next steps:**`
    }

    // ── Point-based with model answers ────────────────────────────────────────
    if (rt.includes('point-based') || rt.includes('model answer')) {
      const mpq = Math.floor(tm / n)
      return `## Point-Based Marking Scheme with Model Answers

**Instructions:** Award points strictly as shown. Accept reasonable alternatives where indicated.

${Array.from({ length: n }, (_, i) => `### Question ${i + 1} (${mpq} marks)

**Question:** [Insert question ${i + 1} here]

**Model Answer:**
[Provide comprehensive model answer for this question on ${topic}]

**Mark Allocation:**
| Point | Description | Marks |
|-------|-------------|-------|
| Point 1 | [Specific correct point — what exactly must be stated] | ${Math.ceil(mpq * 0.3)} |
| Point 2 | [Second key point with sufficient detail] | ${Math.ceil(mpq * 0.3)} |
| Point 3 | [Third point or explanation/example] | ${Math.floor(mpq * 0.25)} |
| Quality | [Clarity, coherence, use of terminology] | ${mpq - Math.ceil(mpq * 0.3) - Math.ceil(mpq * 0.3) - Math.floor(mpq * 0.25)} |

**Acceptable alternatives:** [List any alternative correct answers that should receive full marks]
**Do NOT accept:** [List common wrong answers that look correct but should receive zero]

`).join('\n')}`
    }

    // ── Analytic (default) ───────────────────────────────────────────────────
    const criteria = this.criteriaForAssessment(assessType)
    const cMarks   = Math.floor(tm / criteria.length)

    return `## Analytic Rubric

### Mark Distribution
| Criterion | Maximum Marks | Weighting |
|-----------|--------------|-----------|
${criteria.map((c) => `| ${c.label} | ${cMarks} | ${Math.round(100 / criteria.length)}% |`).join('\n')}
| **Total** | **${tm}** | **100%** |

---

### Detailed Criteria Rubric

${criteria.map((c) => `#### ${c.label} (${cMarks} marks)

| Band | Mark Range | Descriptor |
|------|-----------|------------|
| **Excellent** | ${Math.ceil(cMarks * 0.75)}–${cMarks} | ${c.excellent} |
| **Good** | ${Math.ceil(cMarks * 0.55)}–${Math.ceil(cMarks * 0.75) - 1} | ${c.good} |
| **Satisfactory** | ${Math.ceil(cMarks * 0.4)}–${Math.ceil(cMarks * 0.55) - 1} | ${c.satisfactory} |
| **Fail** | 0–${Math.ceil(cMarks * 0.4) - 1} | ${c.fail} |

`).join('\n')}

### Per-Question Marking Guide

${Array.from({ length: Math.max(n, 3) }, (_, i) => `#### Question ${i + 1} — [Insert question here] (${Math.floor(tm / Math.max(n, 3))} marks)

| Sub-part | Expected answer | Marks |
|----------|----------------|-------|
| (a) | [Model answer for sub-part (a) — specific points about ${topic}] | ${Math.ceil(tm / Math.max(n, 3) * 0.4)} |
| (b) | [Model answer for sub-part (b)] | ${Math.ceil(tm / Math.max(n, 3) * 0.35)} |
| (c) | [Model answer or evaluation/synthesis] | ${Math.floor(tm / Math.max(n, 3) * 0.25)} |

`).join('\n')}`
  }

  private criteriaForAssessment(assessType: string): Array<{
    label: string; excellent: string; good: string; satisfactory: string; fail: string
  }> {
    const at = assessType.toLowerCase()

    if (at.includes('presentation') || at.includes('oral')) {
      return [
        { label: 'Content Accuracy & Depth',   excellent: 'All content accurate, comprehensive coverage, well-researched', good: 'Mostly accurate, good coverage, minor gaps', satisfactory: 'Some accurate content, notable gaps', fail: 'Major inaccuracies or very limited content' },
        { label: 'Organisation & Structure',    excellent: 'Logical flow, clear introduction/body/conclusion, excellent transitions', good: 'Well-organised, minor structural issues', satisfactory: 'Basic structure present, some logical gaps', fail: 'Poorly organised, hard to follow' },
        { label: 'Delivery & Communication',    excellent: 'Confident, clear, engaging, excellent eye contact and pace', good: 'Clear, mostly engaging, minor issues with delivery', satisfactory: 'Understandable but lacks confidence or clarity', fail: 'Unclear, unprepared, difficult to follow' },
        { label: 'Visual Aids / Materials',     excellent: 'Professional, enhances message, no errors, well-designed', good: 'Good quality, minor issues', satisfactory: 'Adequate, functional', fail: 'Poor quality, missing, or distracting' },
        { label: 'Q&A Handling',               excellent: 'Precise, insightful, demonstrates deep understanding', good: 'Adequate responses, some hesitation', satisfactory: 'Basic responses, limited depth', fail: 'Unable to respond appropriately' },
      ]
    }

    if (at.includes('lab') || at.includes('practical')) {
      return [
        { label: 'Experimental Design & Method',   excellent: 'Precise, reproducible, all variables controlled', good: 'Generally sound, minor procedural issues', satisfactory: 'Acceptable approach, some gaps', fail: 'Unsound or missing methodology' },
        { label: 'Data Recording & Accuracy',      excellent: 'All data complete, correctly recorded, appropriate units', good: 'Data mostly complete, minor errors', satisfactory: 'Some data missing or incorrect units', fail: 'Data largely missing or incorrect' },
        { label: 'Analysis & Interpretation',       excellent: 'Thorough analysis, all trends explained with theory', good: 'Good analysis, most trends addressed', satisfactory: 'Basic analysis, limited interpretation', fail: 'Little or no meaningful analysis' },
        { label: 'Conclusions & Error Analysis',    excellent: 'Clear, evidence-based conclusions; comprehensive error analysis', good: 'Valid conclusions; adequate error discussion', satisfactory: 'Partial conclusions; limited error analysis', fail: 'No valid conclusions or error analysis' },
      ]
    }

    if (at.includes('project') || at.includes('dissertation') || at.includes('thesis')) {
      return [
        { label: 'Research Quality & Literature',  excellent: 'Comprehensive, critically evaluated, recent sources', good: 'Good coverage, mostly critical', satisfactory: 'Adequate, some description-only', fail: 'Poor or missing literature review' },
        { label: 'Methodology',                    excellent: 'Rigorous, well-justified, reproducible', good: 'Sound methodology, minor weaknesses', satisfactory: 'Acceptable but limited justification', fail: 'Flawed or unjustified methodology' },
        { label: 'Analysis & Discussion',          excellent: 'Deep, critical analysis linked to literature', good: 'Good analysis, some linkage to theory', satisfactory: 'Basic analysis, limited linkage', fail: 'Descriptive only, no real analysis' },
        { label: 'Conclusions & Recommendations', excellent: 'Clear, evidence-based, addresses objectives', good: 'Valid conclusions, mostly evidence-based', satisfactory: 'Partial conclusions', fail: 'Weak or unsupported conclusions' },
        { label: 'Presentation & Referencing',    excellent: 'Professional format, flawless citations', good: 'Good format, minor citation errors', satisfactory: 'Acceptable format, some errors', fail: 'Poor format, missing references' },
      ]
    }

    // Default (exam, assignment, essay, case study)
    return [
      { label: 'Knowledge & Understanding',    excellent: 'Comprehensive, accurate, sophisticated understanding of topic', good: 'Mostly accurate, good breadth of knowledge', satisfactory: 'Basic understanding, some gaps or errors', fail: 'Little accurate knowledge demonstrated' },
      { label: 'Analysis & Critical Thinking', excellent: 'Deep analysis, original insights, evaluates multiple perspectives', good: 'Good analysis, some depth, mostly evidence-based', satisfactory: 'Some analysis evident but mainly descriptive', fail: 'Descriptive only, no analysis' },
      { label: 'Application',                  excellent: 'Accurately applies concepts to novel contexts with confidence', good: 'Applies concepts with minor errors', satisfactory: 'Limited or mechanical application', fail: 'Unable to apply concepts' },
      { label: 'Structure & Argument',         excellent: 'Logical, coherent, well-signposted argument throughout', good: 'Well-organised, argument mostly clear', satisfactory: 'Basic structure, argument sometimes unclear', fail: 'Poorly organised, no clear argument' },
      { label: 'Use of Evidence & References', excellent: 'Extensive, relevant, correctly cited evidence', good: 'Good evidence, minor citation errors', satisfactory: 'Some evidence, inconsistent citation', fail: 'Little or no evidence, no citations' },
    ]
  }
}

export const markingSchemeGenerator = new MarkingSchemeGenerator()
