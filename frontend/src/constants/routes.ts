export const ROUTES = {
  // Public
  HOME:             '/',
  SIGN_IN:          '/sign-in',
  SIGN_UP:          '/sign-up',
  FORGOT_PASSWORD:  '/forgot-password',
  RESET_PASSWORD:   '/reset-password',
  VERIFY_EMAIL:     '/verify-email',

  // App — core
  DASHBOARD:        '/dashboard',

  // Study Tools
  STUDY_TOOLS:      '/study-tools',

  // Study Planner
  STUDY_PLANNER:    '/study-planner',

  // Plagiarism & AI Detection
  PLAGIARISM_CHECK: '/plagiarism-check',

  // Class Connect (Official tier)
  CLASS_CONNECT:        '/class-connect',
  CLASS_DETAIL:         '/class-connect/:courseId',

  // ThesisCraft
  THESISCRAFT:          '/thesiscraft',
  THESISCRAFT_PROPOSAL: '/thesiscraft/proposal',
  THESISCRAFT_CHAPTERS: '/thesiscraft/chapters',
  THESISCRAFT_CITATIONS:'/thesiscraft/citations',

  // Submissions
  SUBMISSIONS:      '/submissions',

  // Settings
  SETTINGS:              '/settings',
  SETTINGS_PROFILE:      '/settings/profile',
  SETTINGS_AI:           '/settings/ai-providers',
  SETTINGS_NOTIFICATIONS:'/settings/notifications',
  SETTINGS_APPEARANCE:   '/settings/appearance',
  SETTINGS_INSTITUTION:  '/settings/institution',

  // Billing
  BILLING:          '/billing',
  BILLING_PLANS:    '/billing/plans',
  BILLING_INVOICES: '/billing/invoices',
  BILLING_PAYMENTS: '/billing/payments',
  BILLING_API_KEYS: '/billing/api-keys',
  BILLING_USAGE:    '/billing/usage',

  // Analytics
  ANALYTICS:             '/analytics',
  ANALYTICS_TEACHING:    '/analytics/teaching',
  ANALYTICS_ASSESSMENTS: '/analytics/assessments',
  AI_INSIGHTS:           '/analytics/ai-insights',
  REPORTS:               '/analytics/reports',

  // AI Engine / Generation
  AI_STUDIO:            '/ai-studio',
  GEN_DOCUMENTS:        '/ai-studio/documents',
  GEN_TEMPLATES:        '/ai-studio/templates',
  GEN_HISTORY:          '/ai-studio/history',
  GEN_DOCUMENT_DETAIL:  '/ai-studio/documents/:id',
  GEN_LECTURE_NOTES:    '/ai-studio/lecture-notes',
  GEN_LESSON_PLAN:      '/ai-studio/lesson-plan',
  GEN_ASSIGNMENT:       '/ai-studio/assignment',
  GEN_QUIZ:             '/ai-studio/quiz',
  GEN_EXAM:             '/ai-studio/exam',
  GEN_MARKING_SCHEME:   '/ai-studio/marking-scheme',
  GEN_PRESENTATION:     '/ai-studio/presentation',
  GEN_COURSE_OUTLINE:   '/ai-studio/course-outline',

  // Document Library
  DOCUMENT_LIBRARY:   '/library',
  DOCUMENT_EDITOR:    '/library/editor/:id',
  DOCUMENT_COMPARISON:'/library/compare',
  LIBRARY_TRASH:      '/library/trash',
  LIBRARY_SHARED:     '/library/shared',
  APPROVAL_QUEUE:     '/library/approval-queue',
  EXPORT_CENTER:      '/library/exports',

  // Courses (educator-facing; mapped to class-connect for student view)
  COURSES:       '/class-connect',
  COURSE_DETAIL: '/class-connect/:courseId',
  COURSE_CREATE: '/class-connect/new',

  // Academic
  ACADEMIC_COURSES:      '/academic/courses',
  ACADEMIC_COURSE_DETAIL:'/academic/courses/:courseId',

  // Assessment
  ASSESSMENT_LIST:    '/assessments',
  ASSESSMENT_BUILDER: '/assessments/builder',
  QUESTION_BANK:      '/assessments/question-bank',
  QUESTION_EDITOR:    '/assessments/question-bank/editor',
  MODERATION_QUEUE:   '/assessments/moderation',

  // Student
  STUDENT_COURSES:     '/class-connect',
  STUDENT_ASSIGNMENT:  '/submissions',
  STUDENT_SUBMISSIONS: '/submissions',

  // Collaboration
  WORKSPACE_DASHBOARD: '/workspaces/:workspaceId',
  MESSAGES:            '/messages',
  CONVERSATION:        '/messages/:conversationId',
  CALENDAR:            '/calendar',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function buildRoute(route: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value),
    route,
  )
}
