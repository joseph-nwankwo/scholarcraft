import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { billingApi } from '@/lib/api/billing.api'
import { formatDate } from '@/lib/utils/format'

interface Invoice {
  id: string; invoiceNumber: string; amount: string; total: string
  currency: string; status: string; dueDate: string; paidAt: string | null
  createdAt: string
}

const STATUS_STYLES: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700',
  OPEN: 'bg-blue-50 text-blue-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  VOID: 'bg-gray-100 text-gray-400',
  UNCOLLECTIBLE: 'bg-red-50 text-red-600',
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    billingApi.getInvoices({ page, limit: 20 })
      .then((res) => { setInvoices(res.data.items); setTotal(res.data.total) })
      .finally(() => setLoading(false))
  }, [page])

  async function handleDownload(invoice: Invoice) {
    setDownloading(invoice.id)
    try {
      const res = await billingApi.downloadInvoice(invoice.id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url; a.download = `invoice-${invoice.invoiceNumber}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Download failed')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left p-4 font-semibold text-gray-600">Invoice #</th>
              <th className="text-left p-4 font-semibold text-gray-600">Date</th>
              <th className="text-left p-4 font-semibold text-gray-600">Due</th>
              <th className="text-right p-4 font-semibold text-gray-600">Amount</th>
              <th className="text-center p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No invoices yet</td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-mono text-gray-800">{inv.invoiceNumber}</td>
                <td className="p-4 text-gray-600">{formatDate(inv.createdAt)}</td>
                <td className="p-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                <td className="p-4 text-right font-medium">{inv.currency} {Number(inv.total).toFixed(2)}</td>
                <td className="p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="p-4">
                  <button onClick={() => handleDownload(inv)}
                    disabled={downloading === inv.id}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                    <Download className="w-3.5 h-3.5" />
                    {downloading === inv.id ? '...' : 'PDF'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {total > 20 && (
          <div className="p-4 flex justify-between items-center border-t border-gray-100">
            <span className="text-sm text-gray-500">{total} invoices total</span>
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
