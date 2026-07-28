import { useEffect, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'

interface Payment {
  id: string; amount: string; currency: string; status: string
  paymentProvider: string; transactionReference: string | null
  createdAt: string; invoice?: { invoiceNumber: string }
}

const STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: 'bg-green-50 text-green-700',
  PENDING: 'bg-yellow-50 text-yellow-700',
  FAILED: 'bg-red-50 text-red-700',
  REFUNDED: 'bg-purple-50 text-purple-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    billingApi.getPayments({ page, limit: 20 })
      .then((res) => { setPayments(res.data.items); setTotal(res.data.total) })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Date</th>
              <th className="text-left p-4 font-semibold text-gray-600">Invoice</th>
              <th className="text-left p-4 font-semibold text-gray-600">Provider</th>
              <th className="text-right p-4 font-semibold text-gray-600">Amount</th>
              <th className="text-center p-4 font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No payments yet</td></tr>
            ) : payments.map((pmt) => (
              <tr key={pmt.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 text-gray-600">{formatDate(pmt.createdAt)}</td>
                <td className="p-4 font-mono text-gray-700 text-xs">{pmt.invoice?.invoiceNumber ?? '—'}</td>
                <td className="p-4 text-gray-600 capitalize">{pmt.paymentProvider.toLowerCase()}</td>
                <td className="p-4 text-right font-medium">{pmt.currency} {Number(pmt.amount).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[pmt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {pmt.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="p-4 flex justify-between items-center border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} payments total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40">Prev</button>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
