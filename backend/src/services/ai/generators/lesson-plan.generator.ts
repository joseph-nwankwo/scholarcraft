import { BaseGenerator, type GenerationParams } from './base.generator'
import type { DocumentType } from '@prisma/client'

export class LessonPlanGenerator extends BaseGenerator {
  readonly documentType: DocumentType = 'LESSON_PLAN'
  readonly moduleType = 'lesson-plan'

  buildTitle(params: GenerationParams): string {
    const weeks = params.numberOfWeeks ?? 1
    return `${weeks > 1 ? `${weeks}-Week ` : ''}Lesson Plan: ${params.topic}${params.courseCode ? ` (${params.courseCode})` : ''}`
  }

  buildSystemPrompt(): string {
    return `You are an expert instructional designer and academic curriculum consultant with deep knowledge of Nigerian higher education standards.
You produce detailed, practical lesson plans aligned with NUC standards and modern pedagogical practices.
Format output in clean Markdown. Include specific timings, activities, and assessments.`
  }

  buildPrompt(params: GenerationParams): string {
    const weeks = params.numberOfWeeks ?? 1
    const duration = params.duration ?? 90
    const course = params.courseTitle
      ? `Course: ${params.courseTitle}${params.courseCode ? ` (${params.courseCode})` : ''}`
      : ''
    const bloom = params.bloomLevel ? `Dominant Cognitive Level: ${this.bloomLabel(params.bloomLevel)}` : ''
    const extra = this.commonInstructions(params)

    return `Generate a detailed ${weeks > 1 ? `${weeks}-week` : 'single-session'} lesson plan for:

Topic: ${params.topic}
${course}
Academic Level: ${this.levelLabel(params.academicLevel)}
Lecture Duration: ${duration} minutes per session
Teaching Style: ${params.teachingStyle ?? 'Blended (lecture + discussion + activity)'}
${bloom}
${extra ? `\nAdditional Instructions: ${extra}` : ''}

Produce the complete lesson plan with the following structure:

# Lesson Plan: ${params.topic}

## Course Information
| Item | Details |
|------|---------|
| Course | ${params.courseTitle ?? '[Course Name]'} |
| Level | ${this.levelLabel(params.academicLevel)} |
| Duration | ${duration} minutes |
| Week(s) | ${weeks} |
| Teaching Method | ${params.teachingStyle ?? 'Blended'} |

## Overall Learning Outcomes
(What students will be able to do by the end of this lesson/unit)

${Array.from({ length: weeks }, (_, i) => `## Week ${i + 1}: [Sub-topic]

### Learning Objectives
(Specific, measurable objectives for this session)

### Pre-class Preparation
**For Lecturer:**
- Materials to prepare
- Equipment needed

**For Students:**
- Pre-reading assignments
- Pre-class activities

### Lesson Sequence

| Time | Activity | Teaching Method | Resources |
|------|----------|-----------------|-----------|
| 0-10 min | Introduction & review | | |
| 10-X min | Main content delivery | | |
| X-Y min | Student activity | | |
| Y-Z min | Discussion | | |
| Last 5 min | Summary & preview | | |

### Detailed Activity Descriptions
(For each major activity: purpose, instructions, expected outcomes)

### Assessment for This Session
- Formative assessment during class
- Out-of-class assignment (if any)

### Resources
- Textbooks and chapters
- Online resources
- Visual aids / slides

### Differentiation Strategies
(How to support struggling students and challenge advanced students)

### Reflection Notes
(Space for lecturer to add notes after teaching)
`).join('\n')}

## Overall Assessment Plan
- Continuous Assessment: [percentage and methods]
- Final Examination: [format and weighting]

## Course Materials List
(Complete list of required textbooks, articles, and resources)

## Semester / Unit Timeline
| Week | Topic | Assessment | Notes |
|------|-------|------------|-------|
${Array.from({ length: weeks }, (_, i) => `| Week ${i + 1} | [Sub-topic] | [Assessment] | |`).join('\n')}

Make all timings realistic and activities practical for the Nigerian higher education context.`
  }
}

export const lessonPlanGenerator = new LessonPlanGenerator()
