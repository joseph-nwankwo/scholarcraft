export const APP_NAME = 'ScholarCraft'
export const APP_DESCRIPTION = 'AI-powered student companion'
export const APP_VERSION = '1.0.0'

export const ACADEMIC_LEVELS = [
  { value: 'diploma', label: 'Diploma' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional' },
  { value: 'phd', label: 'PhD / Doctoral' },
] as const

export const SEMESTERS = [
  { value: '1', label: 'First Semester' },
  { value: '2', label: 'Second Semester' },
  { value: '3', label: 'Third Semester' },
  { value: 'full', label: 'Full Year' },
] as const

export const TEACHING_STYLES = [
  { value: 'lecture', label: 'Lecture-based' },
  { value: 'socratic', label: 'Socratic / Discussion' },
  { value: 'problem-based', label: 'Problem-based Learning' },
  { value: 'flipped', label: 'Flipped Classroom' },
  { value: 'inquiry', label: 'Inquiry-based' },
  { value: 'project', label: 'Project-based' },
] as const

export const TONES = [
  { value: 'academic', label: 'Academic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'formal', label: 'Formal' },
  { value: 'simplified', label: 'Simplified' },
] as const

export const REFERENCE_STYLES = [
  { value: 'apa', label: 'APA 7th Edition' },
  { value: 'mla', label: 'MLA 9th Edition' },
  { value: 'harvard', label: 'Harvard' },
  { value: 'chicago', label: 'Chicago' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'vancouver', label: 'Vancouver' },
] as const

export const BLOOMS_LEVELS = [
  { value: 'remember', label: 'Remember', color: 'blue' },
  { value: 'understand', label: 'Understand', color: 'cyan' },
  { value: 'apply', label: 'Apply', color: 'green' },
  { value: 'analyze', label: 'Analyze', color: 'yellow' },
  { value: 'evaluate', label: 'Evaluate', color: 'orange' },
  { value: 'create', label: 'Create', color: 'red' },
] as const

export const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
] as const

export const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'essay', label: 'Essay' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'true-false', label: 'True / False' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'case-study', label: 'Case Study' },
  { value: 'scenario', label: 'Scenario-based' },
] as const

export const EXAM_TYPES = [
  { value: 'mid-semester', label: 'Mid-Semester Exam' },
  { value: 'final', label: 'Final Exam' },
  { value: 'cat', label: 'Continuous Assessment Test' },
  { value: 'practice', label: 'Practice Test' },
] as const

export const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF', icon: 'FileText' },
  { value: 'docx', label: 'Microsoft Word', icon: 'FileType' },
  { value: 'pptx', label: 'PowerPoint', icon: 'Presentation' },
  { value: 'markdown', label: 'Markdown', icon: 'FileCode' },
  { value: 'html', label: 'HTML', icon: 'Globe' },
] as const

export const DOCUMENT_TYPES = [
  'lecture-note',
  'question-set',
  'assignment',
  'exam',
  'rubric',
  'course-outline',
  'presentation',
  'uploaded',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]
