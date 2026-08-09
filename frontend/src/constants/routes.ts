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
  BILLING:         '/billing',
  BILLING_PLANS:   '/billing/plans',
  BILLING_INVOICES:'/billing/invoices',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

export function buildRoute(route: string, params: Record<string, string>): string {
  return Object.entries(params).reduce(
    (acc, [key, value]) => acc.replace(`:${key}`, value),
    route,
  )
}
