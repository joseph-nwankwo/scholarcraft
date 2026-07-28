import { apiClient as api } from './client'

export const billingApi = {
  // Plans
  getPlans: () => api.get('/billing/plans'),
  getPlan: (id: string) => api.get(`/billing/plans/${id}`),

  // Subscription (institution admin)
  getSubscription: () => api.get('/billing/subscription'),
  createSubscription: (data: { planId: string; couponCode?: string; trialDays?: number }) =>
    api.post('/billing/subscription', data),
  upgradeSubscription: (data: { planId: string; prorate?: boolean }) =>
    api.patch('/billing/subscription/upgrade', data),
  cancelSubscription: (immediate?: boolean) =>
    api.patch('/billing/subscription/cancel', { immediate }),
  resumeSubscription: () => api.patch('/billing/subscription/resume'),

  // Invoices
  getInvoices: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/billing/invoices', { params }),
  getInvoice: (id: string) => api.get(`/billing/invoices/${id}`),
  downloadInvoice: (id: string) =>
    api.get(`/billing/invoices/${id}/download`, { responseType: 'blob' }),

  // Payments
  initiatePayment: (data: { invoiceId: string; provider?: string }) =>
    api.post('/billing/payments/initiate', data),
  getPayments: (params?: { page?: number; limit?: number }) =>
    api.get('/billing/payments', { params }),
  getPaymentStatus: (sessionId: string, provider: string) =>
    api.get('/billing/payments/status', { params: { sessionId, provider } }),

  // Usage
  getUsageSummary: () => api.get('/billing/usage'),
  getUsageHistory: (params?: { metric?: string; limit?: number }) =>
    api.get('/billing/usage/history', { params }),

  // API Keys
  getApiKeys: () => api.get('/billing/api-keys'),
  generateApiKey: (data: { name: string; scopes?: string[] }) =>
    api.post('/billing/api-keys', data),
  revokeApiKey: (id: string) => api.delete(`/billing/api-keys/${id}`),
  rotateApiKey: (id: string) => api.post(`/billing/api-keys/${id}/rotate`),

  // Coupons
  validateCoupon: (code: string) => api.get(`/billing/coupons/validate/${code}`),

  // Feature flags
  checkFeature: (feature: string) => api.get(`/billing/features/${feature}`),

  // Admin
  admin: {
    getSubscriptions: (params?: { page?: number; limit?: number; status?: string }) =>
      api.get('/billing/admin/subscriptions', { params }),
    getSubscriptionStats: () => api.get('/billing/admin/subscriptions/stats'),
    getSubscription: (id: string) => api.get(`/billing/admin/subscriptions/${id}`),

    getInvoices: (params?: { page?: number; limit?: number; status?: string; institutionId?: string }) =>
      api.get('/billing/admin/invoices', { params }),
    voidInvoice: (id: string) => api.patch(`/billing/admin/invoices/${id}/void`),
    getRevenueStats: (params?: { from?: string; to?: string }) =>
      api.get('/billing/admin/revenue', { params }),

    getPayments: (params?: { page?: number; limit?: number; status?: string }) =>
      api.get('/billing/admin/payments', { params }),

    getCoupons: (params?: { page?: number; limit?: number; active?: boolean }) =>
      api.get('/billing/admin/coupons', { params }),
    createCoupon: (data: {
      code: string; discountType: string; discountValue: number
      expirationDate?: string; usageLimit?: number; description?: string
    }) => api.post('/billing/admin/coupons', data),
    revokeCoupon: (id: string) => api.patch(`/billing/admin/coupons/${id}/revoke`),
    getCouponStats: (id: string) => api.get(`/billing/admin/coupons/${id}/stats`),

    getUsage: (institutionId: string) => api.get(`/billing/admin/usage/${institutionId}`),

    getFeatureFlags: () => api.get('/billing/admin/feature-flags'),
    getFlagsForPlan: (planId: string) => api.get(`/billing/admin/feature-flags/${planId}`),
    setFlag: (data: { planId: string; name: string; enabled: boolean }) =>
      api.put('/billing/admin/feature-flags', data),
    deleteFlag: (planId: string, name: string) =>
      api.delete(`/billing/admin/feature-flags/${planId}/${name}`),
  },
}
