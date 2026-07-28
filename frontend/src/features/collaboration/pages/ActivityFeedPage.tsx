import { useEffect, useState } from 'react'
import { FileText, Bot, FileEdit, MessageSquare, CheckCircle2, Building2, CreditCard, CalendarDays, Circle } from 'lucide-react'
import { activityApi } from '../../../lib/api/activity.api'
import { formatDate } from '../../../lib/utils/format'

interface ActivityItem {
  id: string
  action: string
  entityType: string
  entityTitle: string | null
  createdAt: string
  actor: { id: string; name: string; avatarUrl: string | null }
}

const actionIcon = (action: string) => {
  if (action.startsWith('document'))  return <FileText className="h-3.5 w-3.5 text-blue-500" />
  if (action.startsWith('ai'))        return <Bot className="h-3.5 w-3.5 text-purple-500" />
  if (action.startsWith('assessment')) return <FileEdit className="h-3.5 w-3.5 text-indigo-500" />
  if (action.startsWith('comment'))   return <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
  if (action.startsWith('approval'))  return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
  if (action.startsWith('workspace')) return <Building2 className="h-3.5 w-3.5 text-amber-500" />
  if (action.startsWith('billing'))   return <CreditCard className="h-3.5 w-3.5 text-pink-500" />
  if (action.startsWith('calendar'))  return <CalendarDays className="h-3.5 w-3.5 text-teal-500" />
  return <Circle className="h-2 w-2 text-gray-400 fill-current" />
}

const actionLabel = (action: string) =>
  action.split('.').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ')

export default function ActivityFeedPage() {
  const [items, setItems] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<string>('')

  const load = async (p: number, reset?: boolean) => {
    setLoading(true)
    try {
      const res = await activityApi.getInstitutionFeed({ page: p, limit: 20, entityType: filter || undefined })
      const incoming = res.data.items ?? []
      setItems((prev) => reset ? incoming : [...prev, ...incoming])
      setHasMore(incoming.length === 20)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1); load(1, true) }, [filter])

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    load(next)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">All types</option>
          <option value="document">Documents</option>
          <option value="assessment">Assessments</option>
          <option value="ai">AI</option>
          <option value="approval">Approvals</option>
          <option value="workspace">Workspace</option>
        </select>
      </div>

      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={item.id} className="relative pl-8 pb-4">
            {idx < items.length - 1 && (
              <div className="absolute left-3.5 top-6 bottom-0 w-px bg-gray-200" />
            )}
            <div className="absolute left-0 top-0 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-sm">
              {actionIcon(item.action)}
            </div>
            <div className="bg-white border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-gray-800">{item.actor.name}</span>
                <span className="text-sm text-gray-500">{actionLabel(item.action)}</span>
                {item.entityTitle && (
                  <span className="text-sm font-medium text-indigo-600">"{item.entityTitle}"</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{item.entityType}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>}

      {!loading && hasMore && (
        <button
          onClick={loadMore}
          className="w-full border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50 mt-4"
        >
          Load more
        </button>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-gray-400">No activity yet.</div>
      )}
    </div>
  )
}
