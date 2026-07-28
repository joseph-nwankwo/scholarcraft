import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Zap, Users, BookOpen, HardDrive, Download } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ProgressBar } from '@/features/analytics/components/Charts'
import { ROUTES } from '@/constants/routes'
import { formatDate } from '@/lib/utils/format'

interface UsageEntry {
  metric: string; label: string; used: number; limit: number | null
  percentage: number; unlimited: boolean
}

interface UsageSummary {
  periodStart: string | null; periodEnd: string | null
  plan: { name: string; slug: string } | null
  metrics: Record<string, UsageEntry>
}

interface Subscription {
  id: string; status: string; currentPeriodStart: string; currentPeriodEnd: string
  trialEndsAt: string | null; autoRenew: boolean
  plan: { name: string; slug: string; price: string; billingCycle: string }
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-600 bg-green-50',
  TRIALING: 'text-blue-600 bg-blue-50',
  PAST_DUE: 'text-red-600 bg-red-50',
  CANCELLED: 'text-gray-600 bg-gray-100',
  EXPIRED: 'text-gray-600 bg-gray-100',
  PAUSED: 'text-yellow-600 bg-yellow-50',
}

const METRIC_ICON: Record<string, React.ReactNode> = {
  aiTokens: <Zap className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  courses: <BookOpen className="w-4 h-4" />,
  exports: <Download className="w-4 h-4" />,
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([billingApi.getSubscription(), billingApi.getUsageSummary()])
      .then(([subRes, usageRes]) => {
        setSubscription(subRes.data.data)
        setUsage(usageRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading billing info...</div>

  const plan = subscription?.plan

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
        <Link to={ROUTES.BILLING_PLANS}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Upgrade Plan
        </Link>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <h2 className="text-xl font-semibold text-gray-900">{plan?.name ?? 'No Plan'}</h2>
            </div>
          </div>
          {subscription && (
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLOR[subscription.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {subscription.status}
            </span>
          )}
        </div>

        {plan && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="font-semibold">${plan.price}/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</p>
            </div>
            {subscription?.currentPeriodEnd && (
              <div>
                <p className="text-xs text-gray-500">Renews</p>
                <p className="font-semibold">{formatDate(subscription.currentPeriodEnd)}</p>
              </div>
            )}
            {subscription?.trialEndsAt && (
              <div>
                <p className="text-xs text-gray-500">Trial ends</p>
                <p className="font-semibold text-blue-600">{formatDate(subscription.trialEndsAt)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Auto-renew</p>
              <p className="font-semibold">{subscription?.autoRenew ? 'On' : 'Off'}</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <Link to={ROUTES.BILLING_INVOICES} className="text-sm text-indigo-600 hover:underline">
            View Invoices
          </Link>
          <span className="text-gray-300">|</span>
          <Link to={ROUTES.BILLING_PAYMENTS} className="text-sm text-indigo-600 hover:underline">
            Payment History
          </Link>
          {subscription?.status === 'ACTIVE' && (
            <>
              <span className="text-gray-300">|</span>
              <button className="text-sm text-red-500 hover:underline"
                onClick={async () => {
                  if (!confirm('Cancel at end of period?')) return
                  await billingApi.cancelSubscription(false)
                  window.location.reload()
                }}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Usage */}
      {usage && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Current Period Usage</h3>
            {usage.periodEnd && (
              <p className="text-xs text-gray-500">Resets {formatDate(usage.periodEnd)}</p>
            )}
          </div>
          <div className="space-y-4">
            {Object.entries(usage.metrics).map(([key, entry]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    {METRIC_ICON[key]}
                    <span>{entry.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {entry.unlimited ? 'Unlimited' : `${entry.used.toLocaleString()} / ${entry.limit?.toLocaleString()}`}
                  </span>
                </div>
                {!entry.unlimited && (
                  <ProgressBar value={entry.used} max={entry.limit ?? 1}
                    color={entry.percentage > 85 ? '#ef4444' : entry.percentage > 60 ? '#f59e0b' : '#6366f1'} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Plans', href: ROUTES.BILLING_PLANS, icon: <Zap className="w-5 h-5" /> },
          { label: 'Invoices', href: ROUTES.BILLING_INVOICES, icon: <CreditCard className="w-5 h-5" /> },
          { label: 'API Keys', href: ROUTES.BILLING_API_KEYS, icon: <HardDrive className="w-5 h-5" /> },
          { label: 'Usage', href: ROUTES.BILLING_USAGE, icon: <Download className="w-5 h-5" /> },
        ].map((item) => (
          <Link key={item.href} to={item.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-gray-600 hover:text-indigo-600">
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
