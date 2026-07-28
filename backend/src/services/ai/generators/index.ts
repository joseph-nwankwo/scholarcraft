import { lectureNotesGenerator } from './lecture-notes.generator'
import { lessonPlanGenerator }   from './lesson-plan.generator'
import { assignmentGenerator }   from './assignment.generator'
import { quizGenerator }         from './quiz.generator'
import { examGenerator }         from './exam.generator'
import { markingSchemeGenerator } from './marking-scheme.generator'
import { presentationGenerator } from './presentation.generator'
import { courseOutlineGenerator } from './course-outline.generator'
import { questionBankGenerator } from './question-bank.generator'
import type { BaseGenerator }    from './base.generator'

export const generators: Record<string, BaseGenerator> = {
  'lecture-notes':    lectureNotesGenerator,
  'lesson-plan':      lessonPlanGenerator,
  'assignment':       assignmentGenerator,
  'quiz':             quizGenerator,
  'exam':             examGenerator,
  'marking-scheme':   markingSchemeGenerator,
  'presentation':     presentationGenerator,
  'course-outline':   courseOutlineGenerator,
  'question-bank':    questionBankGenerator,
}

export const GENERATOR_TYPES = Object.keys(generators)

export type GeneratorType = keyof typeof generators

export function getGenerator(type: string): BaseGenerator {
  const g = generators[type]
  if (!g) throw new Error(`Unknown generator type: ${type}`)
  return g
}

export { lectureNotesGenerator, lessonPlanGenerator, assignmentGenerator, quizGenerator,
         examGenerator, markingSchemeGenerator, presentationGenerator, courseOutlineGenerator,
         questionBankGenerator }
