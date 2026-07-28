import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { AuthGuard } from './guards/AuthGuard'
import { ROUTES } from '@/constants/routes'

// ── Auth ──────────────────────────────────────────────────────────────────────
const SignInPage         = lazy(() => import('@/features/auth/pages/SignInPage'))
const SignUpPage         = lazy(() => import('@/features/auth/pages/SignUpPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const VerifyEmailPage    = lazy(() => import('@/features/auth/pages/VerifyEmailPage'))

// ── Errors ────────────────────────────────────────────────────────────────────
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'))

// ── Layouts ───────────────────────────────────────────────────────────────────
const AppLayout  = lazy(() => import('@/layouts/AppLayout/AppLayout'))
const AuthLayout = lazy(() => import('@/layouts/AuthLayout/AuthLayout'))

// ── Student pages ─────────────────────────────────────────────────────────────
const DashboardPage      = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const StudyPlannerPage   = lazy(() => import('@/features/study-planner/pages/StudyPlannerPage'))
const StudyToolsPage     = lazy(() => import('@/features/study-tools/pages/StudyToolsPage'))
const PlagiarismCheckPage= lazy(() => import('@/features/plagiarism/pages/PlagiarismCheckPage'))
const ClassConnectPage   = lazy(() => import('@/features/class-connect/pages/ClassConnectPage'))
const ThesisCraftPage    = lazy(() => import('@/features/thesiscraft/pages/ThesisCraftPage'))

// ── Billing ───────────────────────────────────────────────────────────────────
const BillingPage        = lazy(() => import('@/features/billing/pages/BillingPage'))
const PlanComparisonPage = lazy(() => import('@/features/billing/pages/PlanComparisonPage'))
const InvoicesPage       = lazy(() => import('@/features/billing/pages/InvoicesPage'))

// ── Settings ──────────────────────────────────────────────────────────────────
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))

// ── Route tree ────────────────────────────────────────────────────────────────
export const routes: RouteObject[] = [
  // Public — auth pages
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.SIGN_IN,         element: <SignInPage /> },
      { path: ROUTES.SIGN_UP,         element: <SignUpPage /> },
      { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: ROUTES.RESET_PASSWORD,  element: <ResetPasswordPage /> },
      { path: ROUTES.VERIFY_EMAIL,    element: <VerifyEmailPage /> },
    ],
  },

  // Protected — app shell
  {
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/',                    element: <Navigate to={ROUTES.DASHBOARD} replace /> },
          { path: ROUTES.DASHBOARD,       element: <DashboardPage /> },
          { path: ROUTES.STUDY_PLANNER,   element: <StudyPlannerPage /> },
          { path: ROUTES.STUDY_TOOLS,     element: <StudyToolsPage /> },
          { path: ROUTES.PLAGIARISM_CHECK,element: <PlagiarismCheckPage /> },
          { path: ROUTES.CLASS_CONNECT,   element: <ClassConnectPage /> },
          { path: ROUTES.THESISCRAFT,     element: <ThesisCraftPage /> },
          { path: ROUTES.SETTINGS,        element: <SettingsPage /> },
          { path: ROUTES.BILLING,         element: <BillingPage /> },
          { path: ROUTES.BILLING_PLANS,   element: <PlanComparisonPage /> },
          { path: ROUTES.BILLING_INVOICES,element: <InvoicesPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]
