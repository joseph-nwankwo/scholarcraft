import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class CourseOutlineGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'COURSE_OUTLINE'
  readonly moduleType = 'course-outline'

  buildTitle(params: GenerationParams): string {
    const course = params.courseTitle ?? params.topic
    return `Course Outline: ${course}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert curriculum developer and academic administrator with deep knowledge of Nigerian university standards (NUC Minimum Academic Standards and Benchmark).
You produce comprehensive course outlines / syllabi that fully comply with NUC accreditation requirements, institutional academic regulations, and quality assurance best practices.
Format in clean, well-structured Markdown. Include all standard syllabus components: learning outcomes mapped to NQF levels, Bloom's taxonomy, weekly schedule, assessment plan, and all institutional policies.`
  }

  buildPrompt(params: GenerationParams): string {
    const ci           = params.customInstructions ?? ''
    const weeks        = params.numberOfWeeks ?? 15

    // Parse all structured fields from customInstructions
    const creditUnits  = this.parse(ci, 'Credit units')               ?? '3'
    const hoursPerWeek = this.parse(ci, 'Hours per week')             ?? '3'
    const deliveryMode = this.parse(ci, 'Delivery mode')              ?? 'Face-to-face'
    const semesterType = this.parse(ci, 'Semester type')              ?? 'First Semester'

    const incAssessment = this.parseBool(ci, 'Include assessment plan', true)
    const incResources  = this.parseBool(ci, 'Include recommended resources', true)
    const incReferences = params.includeReferences ?? true

    const bloom        = params.bloomLevel ? `Primary Cognitive Level: ${this.bloomLabel(params.bloomLevel)}` : ''

    return `Generate a complete, NUC-compliant course outline / syllabus for:
${this.sourceContextBlock(params)}
Course: ${params.courseTitle ?? params.topic}
Code: ${params.courseCode ?? 'XXX 000'}
Academic Level: ${this.levelLabel(params.academicLevel)}
Credit Units: ${creditUnits}
Contact Hours per Week: ${hoursPerWeek}
Semester Duration: ${weeks} weeks
Semester: ${semesterType}
Delivery Mode: ${deliveryMode}
${bloom}
${ci ? `Additional requirements: ${ci}` : ''}

Produce a complete course outline in the exact format below, replacing ALL placeholder text with accurate, subject-specific content for "${params.courseTitle ?? params.topic}" at ${this.levelLabel(params.academicLevel)} level.

---

# COURSE OUTLINE / SYLLABUS

## ${params.courseTitle ?? params.topic}
### ${params.courseCode ?? 'XXX 000'} · ${creditUnits} Credit Unit${Number(creditUnits) !== 1 ? 's' : ''} · ${semesterType}

---

## COURSE INFORMATION

| | |
|---|---|
| **Course Title** | ${params.courseTitle ?? params.topic} |
| **Course Code** | ${params.courseCode ?? 'XXX 000'} |
| **Credit Units** | ${creditUnits} |
| **Contact Hours** | ${hoursPerWeek} hour${Number(hoursPerWeek) !== 1 ? 's' : ''} per week (${Number(hoursPerWeek) * weeks} total) |
| **Academic Level** | ${this.levelLabel(params.academicLevel)} |
| **Semester** | ${semesterType} |
| **Mode of Delivery** | ${deliveryMode} |
| **Prerequisite(s)** | [List prerequisite courses or "None"] |
| **Department** | [Department name] |
| **Faculty** | [Faculty name] |
| **Session** | [e.g., 2024/2025] |

---

## LECTURER INFORMATION

| | |
|---|---|
| **Lecturer** | [Full Name, Highest Qualification] |
| **Rank / Title** | [Professor / Associate Professor / Dr. / Mr. / Mrs.] |
| **Office** | [Room number, Building] |
| **Email** | [Institutional email] |
| **Phone** | [Office phone] |
| **Office Hours** | [e.g., Monday & Wednesday, 10:00–12:00] |
| **Consultation** | By appointment (email preferred) |

---

## COURSE DESCRIPTION

[Write 2–3 paragraphs covering:
1. What this course is about and the key themes/content areas for ${params.courseTitle ?? params.topic}
2. The relevance of this course to the degree programme and profession
3. How this course connects to real-world practice and the Nigerian/African professional context]

---

## COURSE LEARNING OUTCOMES (CLOs)

Upon successful completion of this course, students will be able to:

| CLO | Statement | Bloom's Level | NQF Descriptor |
|-----|-----------|---------------|----------------|
| CLO 1 | [Recall and define key concepts of ${params.courseTitle ?? params.topic}] | Remember / Understand | Knowledge |
| CLO 2 | [Explain and summarise core theories and principles] | Understand | Comprehension |
| CLO 3 | [Apply [specific methods/techniques] to solve practical problems] | Apply | Application |
| CLO 4 | [Analyse [specific components] and identify relationships] | Analyse | Analysis |
| CLO 5 | [Evaluate different approaches and justify recommendations] | Evaluate | Evaluation |
| CLO 6 | [Design / create [specific product or solution] demonstrating synthesis] | Create | Synthesis |

---

## ALIGNMENT: CLOs × ASSESSMENTS × NUC STANDARDS

| CLO | Assignment | Mid-Semester Test | Final Exam | NUC Standard Reference |
|-----|-----------|-------------------|-----------|------------------------|
| CLO 1 | ✓ | ✓ | ✓ | [NUC MAS reference] |
| CLO 2 | ✓ | ✓ | ✓ | [NUC MAS reference] |
| CLO 3 | ✓ | | ✓ | [NUC MAS reference] |
| CLO 4 | ✓ | ✓ | ✓ | [NUC MAS reference] |
| CLO 5 | ✓ | | ✓ | [NUC MAS reference] |
| CLO 6 | ✓ | | | [NUC MAS reference] |

---

## REQUIRED TEXTBOOKS AND MATERIALS

### Primary Textbook(s)
1. [Author, A. B. (Year). *Title of Textbook: Subtitle*. (Edition). Publisher. ISBN: XXX]
2. [Second required text if applicable — prefer Nigerian or African published works where available]

### Supplementary Reading
1. [Author, A. B. (Year). Title. *Journal Name*, Volume(Issue), Pages.]
2. [Relevant Nigerian/African published reference]
3. [Online resource — title and URL]

### Course Materials
- Lecture slides (available on [LMS/course portal])
- Past examination papers (available in library)
${deliveryMode !== 'Face-to-face' ? '- Video lecture recordings (uploaded weekly to course portal)' : ''}
- Laboratory manual (if applicable)

---

${incAssessment ? `## ASSESSMENT PLAN

### Continuous Assessment (CA): 40%

| # | Assessment Component | Weight | CLOs Assessed | Due / Date |
|---|---------------------|--------|---------------|-----------|
| 1 | Assignment 1 | 10% | CLO 1, CLO 2 | Week 5 |
| 2 | Mid-Semester Test | 15% | CLO 1–CLO 3 | Week 8 |
| 3 | Assignment 2 / Group Project | 10% | CLO 3, CLO 4, CLO 5 | Week 12 |
| 4 | Attendance & Participation | 5% | All CLOs | Continuous |

### Semester Examination: 60%

| Component | Weight | Duration | Format |
|-----------|--------|----------|--------|
| Final Examination | 60% | 3 hours | [MCQ + Theory / Theory only / Practical] |

### Grade Boundaries (NUC Standard)

| Grade | Marks (%) | GP | Classification |
|-------|-----------|----|----------------|
| A | 70–100 | 5.0 | Distinction |
| B | 60–69 | 4.0 | Credit |
| C | 50–59 | 3.0 | Merit |
| D | 45–49 | 2.0 | Pass |
| E | 40–44 | 1.0 | Pass |
| F | 0–39 | 0.0 | Fail |

---
` : ''}

## WEEKLY LECTURE SCHEDULE

| Week | Topic | Sub-topics | Delivery | CLO(s) | Assessment |
|------|-------|-----------|----------|--------|------------|
${Array.from({ length: weeks }, (_, i) => `| ${i + 1} | [Week ${i + 1} topic for ${params.topic}] | [2–3 sub-topics] | [Lecture/Lab/Seminar] | CLO ${(i % 6) + 1} | ${i === 4 ? 'Assignment 1 due' : i === 7 ? 'Mid-Semester Test' : i === 11 ? 'Assignment 2 due' : i === weeks - 1 ? 'Revision' : '—'} |`).join('\n')}

---

## DETAILED WEEKLY CONTENT

${Array.from({ length: weeks }, (_, i) => `### Week ${i + 1}: [Topic Title — replace with actual ${params.topic} topic]

**Lecture Content:**
- [Key concept 1 specific to this week's topic]
- [Key concept 2 — theory, principle, or method]
- [Key concept 3 — application or case study]

**Learning Activities:**
- [In-class discussion, group activity, or demonstration]
${deliveryMode === 'Online' || deliveryMode === 'Hybrid (blended)' ? '- [Online discussion forum task / quiz]' : ''}

**Pre-class Preparation:**
- Reading: [Textbook Chapter X, pp. XX–XX]
${i === 4 ? '- **Assignment 1 due this week** — submit via [LMS/portal]' : ''}
${i === 7 ? '- **Mid-Semester Test this week** — covers Weeks 1–7' : ''}
${i === 11 ? '- **Assignment 2 due this week** — submit via [LMS/portal]' : ''}
${i === weeks - 1 ? '- **Revision week** — review all CLOs; past paper practice' : ''}

`).join('\n')}

---

## COURSE POLICIES

### Attendance Policy
- Minimum attendance: **75%** of all scheduled classes (NUC / institutional regulation)
- Students below 75% attendance will be **barred from the semester examination**
- Absences must be formally reported with supporting documentation (medical certificate, etc.)
- Punctuality is expected — lateness of more than 15 minutes counts as absent

### Submission Policy
- Assignments must be submitted by **23:59 on the due date** via [LMS/physical submission]
- Late penalty: **5 marks deducted per calendar day**
- No submissions accepted after **5 days** past the deadline (score of zero)
- Extensions require written approval **at least 48 hours before the deadline**

### Academic Integrity
- All submitted work must be the student's own original work
- Plagiarism is a serious academic offence — penalties include zero and disciplinary action
- All sources must be properly cited using [${params.referenceStyle ?? 'APA 7th edition'}]
- Group work: each member is responsible for understanding and contributing to all parts

### Communication
- Official communication: institutional email only
- Lecturer response time: within **48 hours** on business days
- Urgent matters: contact the departmental office during working hours

### Special Needs / Disabilities
- Students requiring academic accommodations must register with the Disability Support Unit and notify the lecturer within the **first two weeks** of the semester

---

${incResources ? `## LEARNING RESOURCES

### Library Resources
- University Library: [Name, location, opening hours]
- E-Library portal: [URL or access details]
- Recommended databases: [JSTOR / EBSCO / African Journals Online / Scopus — as applicable]

### Online & Digital Resources
- Course portal / LMS: [URL]
- Recommended websites and professional bodies: [List 3–5 relevant sites]
- Open Educational Resources: [List any relevant free textbooks or MOOCs]

### Laboratory / Studio / Workshop (if applicable)
- Facility: [Name and location]
- Booking: [Procedure for laboratory sessions]
- Safety: [Link to lab safety policy]

---
` : ''}

${incReferences ? `## REFERENCES

[Full bibliography of all texts referenced in this outline, formatted in ${params.referenceStyle ?? 'APA 7th edition'}. Include a minimum of 10 sources — mix of textbooks, journal articles, and Nigerian/African references where available.]

---
` : ''}

*This course outline is subject to minor revision. Students will be notified of any significant changes at least **one week** in advance. The most current version is available on [LMS/course portal].*

*Approved by: Head of Department · Date: [Date]*`
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private parse(text: string, key: string): string | undefined {
    const m = text.match(new RegExp(`${key}:\\s*([^.]+)\\.`))
    return m ? m[1].trim() : undefined
  }

  private parseBool(text: string, key: string, defaultVal: boolean): boolean {
    const m = text.match(new RegExp(`${key}:\\s*(true|false)\\.`))
    if (!m) return defaultVal
    return m[1] === 'true'
  }
}

export const courseOutlineGenerator = new CourseOutlineGenerator()
