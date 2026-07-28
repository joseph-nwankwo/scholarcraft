import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { ROUTES } from '@/constants/routes'

interface Plan {
  id: string; name: string; slug: string; price: string; currency: string
  billingCycle: string; description: string | null; maxUsers: number | null
  maxCourses: number | null; maxStorageGB: number | null; monthlyGenerations: number | null
  apiAccess: boolean; prioritySupport: boolean; customBranding: boolean; ssoEnabled: boolean
}

const FEATURES = [
  { key: 'maxUsers', label: 'Users', fmt: (v: number | null) => v === null ? 'Unlimited' : String(v) },
  { key: 'maxCourses', label: 'Courses', fmt: (v: number | null) => v === null ? 'Unlimited' : String(v) },
  { key: 'maxStorageGB', label: 'Storage', fmt: (v: number | null) => v === null ? 'Unlimited' : `${v} GB` },
  { key: 'monthlyGenerations', label: 'AI Generations/mo', fmt: (v: number | null) => v === null ? 'Unlimited' : v.toLocaleString() },
  { key: 'apiAccess', label: 'API Access', fmt: (v: boolean) => v },
  { key: 'prioritySupport', label: 'Priority Support', fmt: (v: boolean) => v },
  { key: 'customBranding', label: 'Custom Branding', fmt: (v: boolean) => v },
  { key: 'ssoEnabled', label: 'SSO', fmt: (v: boolean) => v },
]

const PLAN_COLORS: Record<string, string> = {
  free: 'border-gray-200',
  starter: 'border-blue-300',
  professional: 'border-indigo-400 ring-2 ring-indigo-400',
  enterprise: 'border-purple-400',
}

export default function PlanComparisonPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSub, setCurrentSub] = useState<{ plan: { slug: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [coupon, setCoupon] = useState('')

  useEffect(() => {
    Promise.all([billingApi.getPlans(), billingApi.getSubscription().catch(() => ({ data: { data: null } }))])
      .then(([plansRes, subRes]) => {
        setPlans(plansRes.data.data)
        setCurrentSub(subRes.data.data)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSelect(plan: Plan) {
    setSelecting(plan.id)
    try {
      if (currentSub) {
        await billingApi.upgradeSubscription({ planId: plan.id, prorate: true })
      } else {
        await billingApi.createSubscription({ planId: plan.id, couponCode: coupon || undefined })
      }
      navigate(ROUTES.BILLING)
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Failed to select plan')
    } finally {
      setSelecting(null)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading plans...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-gray-500 mt-2">Start free. Upgrade as you grow.</p>
      </div>

      {/* Coupon */}
      <div className="flex justify-center mb-8">
        <div className="flex gap-2">
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Coupon code"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {plans.map((plan) => {
          const isCurrent = currentSub?.plan.slug === plan.slug
          return (
            <div key={plan.id}
              className={`bg-white rounded-xl border-2 p-6 flex flex-col ${PLAN_COLORS[plan.slug] ?? 'border-gray-200'} ${plan.slug === 'professional' ? 'relative' : ''}`}>
              {plan.slug === 'professional' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                  Most Popular
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
              <p className="text-sm text-gray-500 mt-1 min-h-[40px]">{plan.description}</p>
              <div className="mt-4 mb-6">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-500 text-sm">/{plan.billingCycle === 'MONTHLY' ? 'mo' : 'yr'}</span>
              </div>
              <button
                disabled={isCurrent || selecting === plan.id}
                onClick={() => handleSelect(plan)}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isCurrent
                    ? 'bg-gray-100 text-gray-400 cursor-default'
                    : plan.slug === 'professional'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                }`}>
                {isCurrent ? 'Current Plan' : selecting === plan.id ? 'Processing...' : plan.price === '0' ? 'Get Started' : 'Select'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Feature comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left p-4 font-semibold text-gray-700">Feature</th>
              {plans.map((p) => (
                <th key={p.id} className="p-4 font-semibold text-gray-700 text-center">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature, i) => (
              <tr key={feature.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-4 text-gray-700">{feature.label}</td>
                {plans.map((plan) => {
                  const val = (plan as unknown as Record<string, unknown>)[feature.key]
                  const formatted = feature.fmt(val as never)
                  return (
                    <td key={plan.id} className="p-4 text-center">
                      {typeof formatted === 'boolean'
                        ? (formatted ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />)
                        : <span className="text-gray-700">{formatted}</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
